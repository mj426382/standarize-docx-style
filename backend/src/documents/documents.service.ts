import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentSource, DocumentStatus, VersionOrigin } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LLM_PORT, LlmPort } from './ports/llm.port';
import { DOCUMENT_CONVERTER_PORT, DocumentConverterPort } from './ports/document-converter.port';
import { sanitizeDocumentHtml } from './html-sanitizer';

/** Dozwolone typy MIME plików wejściowych. */
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_TXT = 'text/plain';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
/** Próg długości HTML, powyżej którego dzielimy dokument na fragmenty dla AI.
 *  Wysoki próg => jak najczęściej wysyłamy CAŁY plik w jednym żądaniu (spójny styl).
 *  Powyżej tego ryzykujemy ucięcie odpowiedzi (limit ~16k tokenów), więc dzielimy. */
const MAX_SINGLE_SHOT_CHARS = 40_000;
/** Maksymalna długość pojedynczego fragmentu wysyłanego do AI (mieści się w limicie odpowiedzi). */
const MAX_CHUNK_CHARS = 18_000;

/** Uproszczony obraz pliku z Multera. */
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Serwis domenowy/aplikacyjny dokumentów.
 * Orkiestruje LLM (formatowanie/edycja), konwersję do .docx, storage i wersjonowanie.
 * Każda operacja waliduje własność dokumentu przez użytkownika.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(DOCUMENT_CONVERTER_PORT) private readonly converter: DocumentConverterPort,
  ) {}

  /**
   * Tworzy dokument z wklejonego tekstu: zamienia tekst na prosty .docx (bez AI), zapisuje wersję 1.
   * Ujednolicenie stylu odbywa się dopiero po kliknięciu przycisku przez użytkownika.
   */
  async createFromText(
    userId: string,
    input: { title?: string; rawText: string },
  ): Promise<{ id: string }> {
    const doc = await this.prisma.document.create({
      data: {
        userId,
        title: input.title?.trim() || this.deriveTitle(input.rawText),
        sourceType: DocumentSource.PASTE,
        status: DocumentStatus.COMPLETED,
      },
    });

    const html = this.textToHtml(input.rawText);
    const docxBuffer = await this.converter.htmlToDocx(html);
    await this.createDocxVersion(doc.id, docxBuffer, VersionOrigin.MANUAL, html);
    return { id: doc.id };
  }

  /**
   * Tworzy dokument z wgranego pliku (.txt/.docx): waliduje i zapisuje plik jako źródło prawdy.
   * Wierny import - po wgraniu NIE uruchamiamy AI; oryginalny .docx jest pierwszą wersją 1:1.
   * @throws BadRequestException dla niedozwolonego typu MIME lub przekroczonego rozmiaru.
   */
  async createFromFile(userId: string, file: UploadedFile): Promise<{ id: string }> {
    this.validateFile(file);

    // Multer/busboy dekoduje nazwę pliku z multipart jako latin1 - przywróć UTF-8,
    // inaczej polskie znaki w tytule (z nazwy pliku) wyświetlają się jako krzaki.
    const originalName = this.fixFilenameEncoding(file.originalname);

    const sourceType = file.mimetype === MIME_DOCX ? DocumentSource.DOCX : DocumentSource.TXT;
    const sourceUrl = await this.storage.uploadFile(
      file.buffer,
      originalName,
      file.mimetype,
      'sources',
    );

    const doc = await this.prisma.document.create({
      data: {
        userId,
        title: this.stripExtension(originalName),
        sourceType,
        sourceUrl,
        status: DocumentStatus.COMPLETED,
      },
    });

    if (file.mimetype === MIME_DOCX) {
      // Oryginalny plik bez zmian jako wersja 1 - edytor renderuje go 1:1.
      await this.createDocxVersion(doc.id, file.buffer, VersionOrigin.MANUAL);
    } else {
      // .txt -> prosty .docx z akapitów (bez AI).
      const html = this.textToHtml(file.buffer.toString('utf-8'));
      const docxBuffer = await this.converter.htmlToDocx(html);
      await this.createDocxVersion(doc.id, docxBuffer, VersionOrigin.MANUAL, html);
    }
    return { id: doc.id };
  }

  /**
   * Edytuje dokument poleceniem (prompt): ekstrahuje HTML z aktualnego .docx, woła LLM, tworzy nową wersję.
   */
  async editByPrompt(userId: string, documentId: string, instruction: string) {
    const doc = await this.getOwnedDocument(userId, documentId);
    const latest = await this.getLatestVersion(documentId);
    this.logger.log(
      `[prompt] START doc=${documentId} wersja=${latest.versionNo} źródło=${
        latest.docxUrl ? 'docx' : 'html'
      } instrukcja="${instruction}"`,
    );

    const currentHtml = await this.extractHtml(latest);
    this.logger.log(`[prompt] wyekstrahowano HTML (${currentHtml.length} znaków), wołam LLM editDocument`);

    const startedAt = Date.now();
    const newHtml = sanitizeDocumentHtml(
      await this.llm.editDocument({ currentHtml, instruction }),
    );
    this.logger.log(
      `[prompt] LLM zwrócił HTML (${newHtml.length} znaków) w ${Date.now() - startedAt}ms, generuję .docx`,
    );

    const version = await this.createVersion(doc.id, newHtml, VersionOrigin.AI_EDIT, instruction);
    this.logger.log(`[prompt] ZAKOŃCZONO doc=${documentId} nowa wersja AI_EDIT=${version.versionNo}`);
    return this.toDetail(doc.id);
  }

  /**
   * Zapisuje ręczną edycję: sanityzuje HTML, regeneruje .docx, tworzy wersję MANUAL.
   */
  async saveManualEdit(userId: string, documentId: string, html: string) {
    const doc = await this.getOwnedDocument(userId, documentId);
    const safe = sanitizeDocumentHtml(html);
    await this.createVersion(doc.id, safe, VersionOrigin.MANUAL);
    return this.toDetail(doc.id);
  }

  /** Zwraca dokument wraz z najnowszą wersją (HTML do podglądu). */
  async getDocument(userId: string, id: string) {
    await this.getOwnedDocument(userId, id);
    return this.toDetail(id);
  }

  /** Lista dokumentów użytkownika z paginacją. */
  async listDocuments(userId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          sourceType: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.document.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Usuwa dokument wraz z plikami źródłowymi i wygenerowanymi. */
  async deleteDocument(userId: string, id: string): Promise<{ success: true }> {
    const doc = await this.getOwnedDocument(userId, id);

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      select: { docxUrl: true },
    });
    const keys = [doc.sourceUrl, ...versions.map((v) => v.docxUrl)].filter(Boolean) as string[];
    await Promise.all(keys.map((key) => this.storage.deleteFile(key)));

    await this.prisma.document.delete({ where: { id } });
    return { success: true };
  }

  /** Zwraca historię wersji dokumentu. */
  async getVersions(userId: string, id: string) {
    await this.getOwnedDocument(userId, id);
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNo: 'desc' },
      select: {
        id: true,
        versionNo: true,
        origin: true,
        instruction: true,
        createdAt: true,
      },
    });
  }

  /**
   * Przywraca wskazaną wersję, tworząc nową wersję z jej treścią (MANUAL).
   * Kopiuje binarny .docx wersji źródłowej, aby zachować wierność 1:1.
   */
  async restoreVersion(userId: string, id: string, versionNo: number) {
    await this.getOwnedDocument(userId, id);
    const source = await this.prisma.documentVersion.findUnique({
      where: { documentId_versionNo: { documentId: id, versionNo } },
    });
    if (!source) {
      throw new NotFoundException('Nie znaleziono wskazanej wersji.');
    }
    if (source.docxUrl) {
      const buffer = await this.storage.getFileBuffer(source.docxUrl);
      await this.createDocxVersion(id, buffer, VersionOrigin.MANUAL, source.html);
    } else {
      await this.createVersion(id, source.html, VersionOrigin.MANUAL);
    }
    return this.toDetail(id);
  }

  /**
   * Zapisuje wyeksportowany z edytora .docx jako nową wersję MANUAL (zachowuje pełną wierność).
   */
  async saveEditedDocx(userId: string, documentId: string, buffer: Buffer) {
    await this.getOwnedDocument(userId, documentId);
    if (!buffer?.length) {
      throw new BadRequestException('Brak pliku do zapisania.');
    }
    await this.createDocxVersion(documentId, buffer, VersionOrigin.MANUAL);
    return this.toDetail(documentId);
  }

  /**
   * Ujednolica styl dokumentu (tabele, akapity, wcięcia) przez AI - wyłącznie na żądanie użytkownika.
   * Oryginał pozostaje zachowany jako wcześniejsza wersja; wynik trafia jako nowa wersja AI_FORMAT.
   */
  async standardizeStyle(userId: string, documentId: string) {
    const doc = await this.getOwnedDocument(userId, documentId);
    const latest = await this.getLatestVersion(documentId);
    this.logger.log(
      `[ujednolicanie] START doc=${documentId} wersja=${latest.versionNo} źródło=${
        latest.docxUrl ? 'docx' : 'html'
      }`,
    );

    // 1) Wyciągnij treść z aktualnego .docx (źródło prawdy).
    const raw = await this.extractHtml(latest);

    // 2) Zapiecz numerację <ol> jako tekst (mammoth renderuje numery automatycznie -
    //    bez tego AI gubi numerację przy spłaszczaniu list do nagłówków).
    const withNumbers = this.bakeOrderedListNumbers(raw);

    // 3) Deterministyczne ujednolicenie (tabele, nagłówki tabel, białe znaki) - bez AI, bezstratne.
    const normalized = this.deterministicNormalize(withNumbers);
    this.logger.log(
      `[ujednolicanie] deterministyczna normalizacja: ${raw.length} -> ${normalized.length} znaków`,
    );

    // 4) AI ujednolica styl. Dla długich dokumentów dzielimy na spójne fragmenty.
    const startedAt = Date.now();
    let formatted: string;
    if (normalized.length <= MAX_SINGLE_SHOT_CHARS) {
      this.logger.log(`[ujednolicanie] tryb jednego żądania (${normalized.length} znaków)`);
      formatted = sanitizeDocumentHtml(
        await this.llm.formatDocument({ content: normalized, title: doc.title, isHtml: true }),
      );
    } else {
      const blocks = this.splitTopLevelBlocks(normalized);
      const chunks = this.groupIntoChunks(blocks, MAX_CHUNK_CHARS);
      this.logger.log(
        `[ujednolicanie] dokument długi - dzielę na ${chunks.length} fragmentów (${blocks.length} bloków)`,
      );
      // Najpierw analizujemy CAŁY plik, by wyprowadzić wspólny przewodnik stylu -
      // dzięki temu wszystkie fragmenty są formatowane jednakowo (spójny styl w całym pliku).
      const styleGuide = await this.llm.deriveStyleGuide(normalized);
      this.logger.log(
        `[ujednolicanie] przewodnik stylu z całego pliku (${styleGuide.length} znaków)`,
      );
      const parts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        this.logger.log(
          `[ujednolicanie] fragment ${i + 1}/${chunks.length} (${chunks[i].length} znaków)`,
        );
        const part = await this.llm.formatDocument({
          content: chunks[i],
          title: i === 0 ? doc.title : undefined,
          isHtml: true,
          chunk: { index: i, total: chunks.length },
          styleGuide,
        });
        parts.push(part);
      }
      formatted = sanitizeDocumentHtml(parts.join('\n'));
    }

    // 5) Ponowna deterministyczna normalizacja po sklejeniu - spójność tabel/akapitów między fragmentami.
    formatted = this.deterministicNormalize(formatted);
    // 6) Ujednolicenie poziomów nagłówków wg numeracji (ten sam poziom = ten sam rozmiar).
    formatted = sanitizeDocumentHtml(this.normalizeHeadingLevels(formatted));
    this.logger.log(
      `[ujednolicanie] AI zakończone w ${Date.now() - startedAt}ms, wynik ${
        formatted.length
      } znaków, generuję .docx`,
    );

    const docxBuffer = await this.converter.htmlToDocx(formatted);
    const version = await this.createDocxVersion(
      documentId,
      docxBuffer,
      VersionOrigin.AI_FORMAT,
      formatted,
    );
    this.logger.log(
      `[ujednolicanie] ZAKOŃCZONO doc=${documentId} nowa wersja AI_FORMAT=${version.versionNo}`,
    );
    return this.toDetail(documentId);
  }

  /**
   * Zwraca Buffer pliku .docx wraz z nazwą do nagłówka Content-Disposition.
   */
  async downloadDocx(
    userId: string,
    documentId: string,
    versionNo?: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.getOwnedDocument(userId, documentId);
    const version = versionNo
      ? await this.prisma.documentVersion.findUnique({
          where: { documentId_versionNo: { documentId, versionNo } },
        })
      : await this.getLatestVersion(documentId);

    if (!version) {
      throw new NotFoundException('Nie znaleziono wersji do pobrania.');
    }

    let buffer: Buffer;
    if (version.docxUrl) {
      buffer = await this.storage.getFileBuffer(version.docxUrl);
    } else {
      buffer = await this.converter.htmlToDocx(version.html);
    }

    return { buffer, filename: `${this.slug(doc.title)}.docx` };
  }

  // ---- metody prywatne ----

  /** Zwraca HTML wersji: z binarnego .docx (źródło prawdy) lub zapisanego pola html. */
  private async extractHtml(version: { html: string; docxUrl: string | null }): Promise<string> {
    if (version.docxUrl) {
      const buffer = await this.storage.getFileBuffer(version.docxUrl);
      const extracted = await this.converter.fileToContent(buffer, MIME_DOCX);
      return extracted.content;
    }
    return version.html;
  }

  /** Deterministyczne, bezstratne ujednolicenie HTML (tabele + białe znaki). */
  private deterministicNormalize(html: string): string {
    return sanitizeDocumentHtml(this.normalizeWhitespace(this.normalizeTables(html)));
  }

  /**
   * Ujednolica tabele bez AI: gdy tabela nie ma nagłówka (<thead>/<th>),
   * pierwszy wiersz staje się nagłówkiem (<thead> z <th>), reszta trafia do <tbody>.
   */
  private normalizeTables(html: string): string {
    return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (full, inner: string) => {
      if (/<th[\s>]/i.test(inner) || /<thead[\s>]/i.test(inner)) {
        return full;
      }
      const rows = inner.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
      if (!rows || rows.length === 0) {
        return full;
      }
      const headerRow = rows[0]
        .replace(/<td\b([^>]*)>/gi, '<th$1>')
        .replace(/<\/td>/gi, '</th>');
      const bodyRows = rows.slice(1).join('');
      const body = bodyRows ? `<tbody>${bodyRows}</tbody>` : '';
      return `<table><thead>${headerRow}</thead>${body}</table>`;
    });
  }

  /** Usuwa puste akapity i nadmiarowe spacje. */
  private normalizeWhitespace(html: string): string {
    return html
      .replace(/<p>(?:\s|&nbsp;|\u00a0)*<\/p>/gi, '')
      .replace(/[ \t\u00a0]{2,}/g, ' ')
      .trim();
  }

  /**
   * Ujednolica POZIOM nagłówków wg głębokości numeracji, tak by nagłówki tego samego
   * poziomu miały identyczny rozmiar: "1.", "2.", "7." -> h2; "1.1.", "2.6." -> h3;
   * "1.1.1." -> h4 itd. (h1 zarezerwowany dla tytułu dokumentu). Numery są już tekstem
   * (wcześniej wypieczone z .docx), więc poziom wyliczamy deterministycznie - niezależnie
   * od tego, jaki tag nadał AI.
   */
  private normalizeHeadingLevels(html: string): string {
    const numberRe = /^\s*(\d+(?:\.\d+)*)\.?\s+\S/;
    const trailingDotRe = /^\s*\d+(?:\.\d+)*\.\s/;
    return this.splitTopLevelBlocks(html)
      .map((block) => {
        const m = block.match(/^\s*<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>\s*$/i);
        if (!m) return block;
        const tag = m[1].toLowerCase();
        const inner = m[2];
        const text = inner
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const nm = text.match(numberRe);
        if (!nm) return block;
        const isHeading = tag.startsWith('h');
        const dotted = nm[1].includes('.');
        // Akapit promujemy do nagłówka tylko, gdy wygląda jak tytuł sekcji
        // (krótki i z numerem zakończonym kropką lub wielopoziomowym) - chroni przed
        // myleniem zwykłej treści zaczynającej się liczbą (np. "2024 rok...").
        if (!isHeading) {
          if (text.length > 100) return block;
          if (!dotted && !trailingDotRe.test(text)) return block;
        }
        const depth = nm[1].split('.').length;
        const level = Math.min(depth + 1, 6); // 1 -> h2, 2 -> h3, ...
        return `<h${level}>${inner}</h${level}>`;
      })
      .join('\n');
  }

  /**
   * "Zapieka" numerację list uporządkowanych (<ol>) jako zwykły tekst w treści.
   *
   * Po wyciągnięciu .docx mammoth zamienia numerację Worda na <ol>, ale sam numer jest
   * renderowany automatycznie (nie ma go w tekście). Gdy AI spłaszcza jednoelementową
   * listę do nagłówka, numer ginie. Tu liczymy numer (z zagnieżdżeniem, np. "1.", "1.1.")
   * i wstawiamy go na stałe do tekstu, więc nie da się go już zgubić - niezależnie od AI.
   * Listy wypunktowane (<ul>) pozostają nietknięte.
   */
  private bakeOrderedListNumbers(html: string): string {
    const tokenRe = /<(\/?)(ol|ul|li)\b[^>]*>/gi;
    const stack: Array<{ type: 'ol' | 'ul'; counter: number }> = [];
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(html)) !== null) {
      out += html.slice(last, m.index);
      last = tokenRe.lastIndex;
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase() as 'ol' | 'ul' | 'li';
      if (tag === 'ol' || tag === 'ul') {
        if (!isClose) {
          stack.push({ type: tag, counter: 0 });
          if (tag === 'ul') out += m[0]; // <ul> zachowujemy, <ol> usuwamy (numer idzie do tekstu)
        } else {
          const ctx = stack.pop();
          if (ctx?.type === 'ul') out += m[0];
        }
        continue;
      }
      // <li>
      const top = stack[stack.length - 1];
      if (top?.type === 'ol') {
        if (!isClose) {
          top.counter += 1;
          const prefix = stack
            .filter((c) => c.type === 'ol')
            .map((c) => c.counter)
            .join('.');
          out += `<p>${prefix}. `;
        } else {
          out += '</p>';
        }
      } else {
        out += m[0]; // <li> z <ul> zostawiamy bez zmian
      }
    }
    out += html.slice(last);
    return out;
  }

  /**
   * Dzieli HTML na samodzielne bloki najwyższego poziomu (akapity, nagłówki, tabele, listy),
   * nie rozcinając wnętrza tabel ani list (liczy zagnieżdżenie znaczników).
   */
  private splitTopLevelBlocks(html: string): string[] {
    const blocks: string[] = [];
    const voidTags = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);
    const tokenRe = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
    let depth = 0;
    let start = 0;
    let inBlock = false;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(html)) !== null) {
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase();
      const selfClose = m[3] === '/' || voidTags.has(tag);
      if (!inBlock) {
        if (!isClose) {
          inBlock = true;
          start = m.index;
          depth = selfClose ? 0 : 1;
          if (depth === 0) {
            blocks.push(html.slice(start, tokenRe.lastIndex));
            inBlock = false;
          }
        }
      } else if (selfClose) {
        // brak zmiany głębokości
      } else if (isClose) {
        depth--;
        if (depth === 0) {
          blocks.push(html.slice(start, tokenRe.lastIndex));
          inBlock = false;
        }
      } else {
        depth++;
      }
    }
    if (inBlock) {
      blocks.push(html.slice(start));
    }
    return blocks.map((b) => b.trim()).filter(Boolean);
  }

  /** Grupuje bloki w fragmenty nieprzekraczające limitu znaków (bez rozcinania bloków). */
  private groupIntoChunks(blocks: string[], maxChars: number): string[] {
    const chunks: string[] = [];
    let current = '';
    for (const block of blocks) {
      if (current && current.length + block.length > maxChars) {
        chunks.push(current);
        current = '';
      }
      current += block;
    }
    if (current) {
      chunks.push(current);
    }
    return chunks;
  }

  /** Zamienia surowy tekst na bezpieczny HTML akapitów (bez AI). */
  private textToHtml(text: string): string {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .map((p) => `<p>${this.escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
      .join('');
    return sanitizeDocumentHtml(paragraphs || '<p></p>');
  }

  /** Escapuje znaki specjalne HTML. */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Tworzy nową wersję z gotowego bufora .docx (źródło prawdy), inkrementuje numer wersji. */
  private async createDocxVersion(
    documentId: string,
    docxBuffer: Buffer,
    origin: VersionOrigin,
    html = '',
    instruction?: string,
  ) {
    const docxUrl = await this.storage.uploadFile(
      docxBuffer,
      `${documentId}-${Date.now()}.docx`,
      MIME_DOCX,
      'documents',
    );

    const last = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    const versionNo = (last?.versionNo ?? 0) + 1;

    const version = await this.prisma.documentVersion.create({
      data: { documentId, versionNo, html, docxUrl, origin, instruction: instruction ?? null },
    });
    await this.prisma.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    });
    return version;
  }

  /** Tworzy nową wersję: generuje .docx, zapisuje do storage, inkrementuje numer wersji. */
  private async createVersion(
    documentId: string,
    html: string,
    origin: VersionOrigin,
    instruction?: string,
  ) {
    const docxBuffer = await this.converter.htmlToDocx(html);
    const docxUrl = await this.storage.uploadFile(
      docxBuffer,
      `${documentId}.docx`,
      MIME_DOCX,
      'documents',
    );

    const last = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    const versionNo = (last?.versionNo ?? 0) + 1;

    const version = await this.prisma.documentVersion.create({
      data: { documentId, versionNo, html, docxUrl, origin, instruction: instruction ?? null },
    });
    await this.prisma.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    });
    return version;
  }

  /** Pobiera dokument i weryfikuje właściciela. */
  private async getOwnedDocument(userId: string, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Nie znaleziono dokumentu.');
    }
    if (doc.userId !== userId) {
      throw new ForbiddenException('Brak dostępu do tego dokumentu.');
    }
    return doc;
  }

  /** Zwraca najnowszą wersję dokumentu. */
  private async getLatestVersion(documentId: string) {
    const version = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNo: 'desc' },
    });
    if (!version) {
      throw new NotFoundException('Dokument nie ma jeszcze żadnej wersji.');
    }
    return version;
  }

  /** Buduje szczegóły dokumentu z najnowszą wersją do podglądu. */
  private async toDetail(id: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({
      where: { id },
      include: {
        versions: { orderBy: { versionNo: 'desc' }, take: 1 },
      },
    });
    const latest = doc.versions[0];
    return {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      sourceType: doc.sourceType,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      latestVersion: latest
        ? {
            versionNo: latest.versionNo,
            html: latest.html,
            origin: latest.origin,
            createdAt: latest.createdAt,
          }
        : null,
    };
  }

  /** Waliduje typ MIME oraz rozmiar pliku. */
  private validateFile(file: UploadedFile): void {
    if (![MIME_DOCX, MIME_TXT].includes(file.mimetype)) {
      throw new BadRequestException('Dozwolone są tylko pliki .txt oraz .docx.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Plik jest zbyt duży (maks. 10 MB).');
    }
  }

  /** Wyprowadza tytuł z pierwszej linii tekstu. */
  private deriveTitle(rawText: string): string {
    const firstLine = rawText.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Dokument';
    return firstLine.slice(0, 80);
  }

  /** Usuwa rozszerzenie z nazwy pliku. */
  private stripExtension(name: string): string {
    return name.replace(/\.[^.]+$/, '');
  }

  /**
   * Przywraca poprawne kodowanie UTF-8 nazwy pliku z multipart.
   * Multer/busboy dekoduje nazwy plików jako latin1, więc znaki UTF-8 (np. polskie)
   * trafiają jako "krzaki" - ponowne zakodowanie do bajtów latin1 i dekodowanie jako UTF-8 je naprawia.
   */
  private fixFilenameEncoding(name: string): string {
    return Buffer.from(name, 'latin1').toString('utf-8');
  }

  /** Tworzy bezpieczną nazwę pliku do pobrania. */
  private slug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'dokument'
    );
  }
}
