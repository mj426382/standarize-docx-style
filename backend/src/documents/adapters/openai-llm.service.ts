import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { LlmPort } from '../ports/llm.port';
import { sanitizeDocumentHtml } from '../html-sanitizer';

/** Parametry retry/backoff dla wywołań OpenAI. */
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000;
// Mocniejszy model dla lepszego, spójnego ujednolicania dużych dokumentów.
const MODEL = 'gpt-4o';
/** Maksymalny czas pojedynczego żądania do OpenAI (ms) - chroni przed zawieszeniem. */
const REQUEST_TIMEOUT_MS = 120_000;
/** Górny limit tokenów odpowiedzi (gpt-4o-mini maks. 16384). */
const MAX_OUTPUT_TOKENS = 16_384;
/** Limit tokenów dla krótkiego przewodnika stylu (analiza całego pliku, mały wynik). */
const STYLE_GUIDE_MAX_TOKENS = 1_200;

/** Kody HTTP, dla których ponawiamy żądanie. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

/**
 * Adapter LLM oparty o OpenAI Chat Completions.
 * Zawiera retry/backoff wykładniczy i deterministyczny tryb E2E do testów UI.
 */
@Injectable()
export class OpenAiLlmService implements LlmPort {
  private readonly logger = new Logger(OpenAiLlmService.name);
  private readonly client: OpenAI;
  private readonly e2eMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.e2eMode = this.config.get<string>('E2E') === 'true';
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY') ?? 'test-key',
      // Własny, krótszy timeout zamiast domyślnych 10 minut SDK + własna logika retry.
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  /**
   * Formatuje surowy tekst w spójny, semantyczny dokument HTML.
   */
  async formatDocument(input: {
    content: string;
    title?: string;
    isHtml?: boolean;
    chunk?: { index: number; total: number };
    styleGuide?: string;
  }): Promise<string> {
    if (this.e2eMode) {
      this.logger.log(`[formatDocument] tryb E2E (deterministyczny), bez wywołania OpenAI`);
      return this.deterministicFormat(input.content, input.title, input.isHtml);
    }

    const isChunk = !!input.chunk && input.chunk.total > 1;
    this.logger.log(
      `[formatDocument] wejście: ${input.content.length} znaków, isHtml=${Boolean(
        input.isHtml,
      )}, tytuł="${input.title ?? ''}"${
        isChunk ? `, fragment ${input.chunk!.index + 1}/${input.chunk!.total}` : ''
      }${input.styleGuide ? ', z przewodnikiem stylu' : ''}`,
    );
    const sourceLabel = input.isHtml
      ? 'Treść źródłowa (HTML wyekstrahowany z dokumentu - zachowaj tabele, listy i nagłówki, jedynie ujednolic formatowanie):'
      : 'Treść do sformatowania:';
    const chunkGuidance = isChunk ? this.chunkGuidance(input.chunk!) : '';
    const styleGuide = input.styleGuide
      ? `\n\nPRZEWODNIK STYLU (wyprowadzony z CAŁEGO dokumentu - stosuj go DOKŁADNIE i identycznie tutaj):\n${input.styleGuide}`
      : '';
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.formatSystemPrompt() },
      {
        role: 'user',
        content: `${this.formatRules()}${styleGuide}${chunkGuidance}\n\nTytuł (jeśli podany): ${
          input.title ?? '(brak - ustal z treści)'
        }\n\n${sourceLabel}\n${input.content}`,
      },
    ];

    const html = await this.openaiChat('formatDocument', messages);
    return sanitizeDocumentHtml(html);
  }

  /**
   * Analizuje CAŁY dokument i zwraca zwięzły przewodnik stylu, by wszystkie fragmenty
   * były formatowane jednakowo (wejście może być duże - liczy się tylko mały wynik).
   */
  async deriveStyleGuide(content: string): Promise<string> {
    if (this.e2eMode) {
      this.logger.log(`[deriveStyleGuide] tryb E2E (deterministyczny), bez wywołania OpenAI`);
      return '- Nagłówki: h1 tytuł, h2 sekcje, h3 podsekcje.\n- Zachowaj numerację.\n- Akapity zwarte, listy punktowane dla wyliczeń.';
    }

    this.logger.log(`[deriveStyleGuide] analiza całego dokumentu: ${content.length} znaków`);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'Jesteś ekspertem typografii. Analizujesz cały dokument i opisujesz spójne zasady jego formatowania. ' +
          'Zwracasz wyłącznie zwięzłą listę punktów (bez HTML, bez markdown).',
      },
      {
        role: 'user',
        content:
          'Na podstawie CAŁEGO poniższego dokumentu wypisz zwięzły przewodnik stylu (maks. 12 punktów), ' +
          'który zapewni IDENTYCZNE formatowanie w całym pliku. Określ: mapowanie poziomów nagłówków, ' +
          'sposób i format numeracji (zachowaj istniejącą), styl list, akapitów, tabel oraz wyróżnień. ' +
          'Nie formatuj dokumentu - tylko opisz zasady.\n\nDOKUMENT:\n' +
          content,
      },
    ];
    const guide = await this.openaiChat('deriveStyleGuide', messages, STYLE_GUIDE_MAX_TOKENS);
    return guide.trim();
  }

  /** Instrukcje zapewniające spójność formatowania między fragmentami dużego dokumentu. */
  private chunkGuidance(chunk: { index: number; total: number }): string {
    const lines = [
      '',
      '',
      `WAŻNE - PRACA NA FRAGMENTACH: To fragment ${chunk.index + 1} z ${
        chunk.total
      } jednego, większego dokumentu.`,
      'Stosuj DOKŁADNIE te same konwencje formatowania we wszystkich fragmentach (te same poziomy nagłówków, ten sam styl list i tabel).',
      'Nie dodawaj treści spoza tego fragmentu i nie powtarzaj treści z innych fragmentów.',
      'Zwróć wyłącznie HTML tego fragmentu, bez owijania w <html>/<body>.',
    ];
    if (chunk.index > 0) {
      lines.push(
        'Nie dodawaj tytułu dokumentu (h1) - tytuł występuje wyłącznie w pierwszym fragmencie.',
      );
    }
    return lines.join('\n');
  }

  /**
   * Edytuje istniejący HTML wg polecenia użytkownika, zmieniając tylko to, o co poproszono.
   */
  async editDocument(input: { currentHtml: string; instruction: string }): Promise<string> {
    if (this.e2eMode) {
      this.logger.log(`[editDocument] tryb E2E (deterministyczny), bez wywołania OpenAI`);
      return this.deterministicEdit(input.currentHtml, input.instruction);
    }

    this.logger.log(
      `[editDocument] wejście: ${input.currentHtml.length} znaków HTML, instrukcja="${input.instruction}"`,
    );
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.editSystemPrompt() },
      {
        role: 'user',
        content: `Polecenie użytkownika: ${input.instruction}\n\nAktualny dokument (HTML):\n${input.currentHtml}\n\nZwróć pełny, zaktualizowany HTML.`,
      },
    ];

    const html = await this.openaiChat('editDocument', messages);
    return sanitizeDocumentHtml(html);
  }

  /**
   * Wykonuje wywołanie chat completion z retry/backoff i wykrywaniem błędu quota.
   * @throws ServiceUnavailableException po wyczerpaniu prób lub przy braku quoty.
   */
  private async openaiChat(
    label: string,
    messages: ChatCompletionMessageParam[],
    maxTokens: number = MAX_OUTPUT_TOKENS,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.logger.log(`[${label}] żądanie do OpenAI (model=${MODEL}, próba ${attempt}/${MAX_RETRIES})`);
        const startedAt = Date.now();
        const completion = await this.client.chat.completions.create({
          model: MODEL,
          messages,
          temperature: 0.2,
          max_tokens: maxTokens,
        });
        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('Pusta odpowiedź modelu.');
        }
        const usage = completion.usage;
        this.logger.log(
          `[${label}] odpowiedź OpenAI w ${Date.now() - startedAt}ms (${content.length} znaków, tokeny: ` +
            `prompt=${usage?.prompt_tokens ?? '?'}, completion=${usage?.completion_tokens ?? '?'}, ` +
            `total=${usage?.total_tokens ?? '?'})`,
        );
        return this.stripCodeFences(content);
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number }).status;

        if (this.isTimeoutError(error)) {
          this.logger.error(
            `[${label}] Przekroczono limit czasu ${REQUEST_TIMEOUT_MS}ms (dokument zbyt duży lub OpenAI wolne).`,
          );
          throw new ServiceUnavailableException(
            'Operacja AI przekroczyła limit czasu. Dokument może być zbyt duży - spróbuj na mniejszym fragmencie.',
          );
        }

        if (this.isQuotaError(error)) {
          this.logger.error(`[${label}] Wyczerpano limit (quota) OpenAI.`);
          throw new ServiceUnavailableException(
            'Usługa AI jest chwilowo niedostępna (limit zapytań). Spróbuj ponownie później.',
          );
        }

        if (!status || !RETRYABLE_STATUSES.has(status) || attempt === MAX_RETRIES) {
          break;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(`[${label}] Błąd ${status}, ponawiam za ${delay}ms (próba ${attempt}).`);
        await this.sleep(delay);
      }
    }

    this.logger.error(`[${label}] Nieudane wywołanie OpenAI: ${String(lastError)}`);
    throw new ServiceUnavailableException('Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.');
  }

  /** Wykrywa błąd przekroczenia limitu (quota) OpenAI. */
  private isQuotaError(error: unknown): boolean {
    const err = error as { code?: string; status?: number };
    return err.code === 'insufficient_quota';
  }

  /** Wykrywa przekroczenie limitu czasu żądania (timeout SDK / przerwane połączenie). */
  private isTimeoutError(error: unknown): boolean {
    const err = error as { name?: string; code?: string };
    return (
      err?.name === 'APIConnectionTimeoutError' ||
      err?.name === 'APIUserAbortError' ||
      err?.code === 'ETIMEDOUT' ||
      err?.code === 'ECONNRESET'
    );
  }

  /** Asynchroniczne opóźnienie. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Usuwa ogrodzenia markdown (```html ... ```), które model czasem dokleja wokół HTML,
   * a które jako zwykły tekst przeciekałyby do dokumentu.
   */
  private stripCodeFences(text: string): string {
    return text
      .replace(/^\uFEFF?\s*```[a-zA-Z]*\s*\n?/, '')
      .replace(/\n?\s*```\s*$/, '')
      .trim();
  }

  /** System prompt formatowania - wymusza czysty, semantyczny HTML. */
  private formatSystemPrompt(): string {
    return [
      'Jesteś ekspertem składu i typografii dokumentów.',
      'Zwracasz wyłącznie poprawny, semantyczny HTML (h1–h3, p, ul/ol/li, table/thead/tbody/tr/th/td, strong/em).',
      'Bez stylów inline, bez <script>, bez <html>/<head>/<body>.',
      'NIE owijaj odpowiedzi w bloki markdown ani ogrodzenia ```html / ``` - zwróć surowy HTML.',
      'Zachowujesz pełną treść użytkownika, nie wymyślasz nowych informacji.',
    ].join(' ');
  }

  /** Reguły formatowania przekazywane w prompt użytkownika. */
  private formatRules(): string {
    return [
      'Zasady formatowania:',
      '1. Spójne nagłówki i hierarchia (jeden h1 jako tytuł, sekcje h2, podsekcje h3).',
      '2. Spójne akapity - łącz urwane linie w logiczne akapity, jednolite odstępy.',
      '3. Listy wypunktowane/numerowane tam, gdzie treść jest enumeracją.',
      '4. Tabele: dane tabelaryczne -> semantyczny <table> z <thead>; spójne kolumny.',
      '5. Zachowaj 100% treści merytorycznej; popraw tylko formatowanie/strukturę.',
      '6. ZACHOWAJ WSZELKĄ istniejącą numerację (nagłówków, sekcji, list, punktów) - nigdy nie usuwaj numerów.',
      '7. Numerowane sekcje/listy zostaw jako <ol> z zachowaniem zagnieżdżenia poziomów (numeracja automatyczna, generyczna jak w Wordzie).',
      '8. Ujednolicaj tylko formę: te same poziomy nagłówków, identyczne wcięcia i odstępy dla tego samego poziomu - bez zmiany treści ani numerów.',
    ].join('\n');
  }

  /** System prompt edycji - zasada minimalnej zmiany. */
  private editSystemPrompt(): string {
    return [
      'Jesteś ekspertem edycji dokumentów HTML.',
      'Zasada minimalnej zmiany: modyfikuj wyłącznie to, o co prosi użytkownik, resztę zostaw bez zmian.',
      'Zwracasz wyłącznie poprawny, semantyczny HTML (h1–h3, p, ul/ol/li, table/thead/tbody/tr/th/td, strong/em).',
      'Bez stylów inline, bez <script>, bez <html>/<head>/<body>. Zwróć pełny zaktualizowany HTML.',
    ].join(' ');
  }

  /** Deterministyczne formatowanie dla trybu E2E (bez wywołań sieciowych). */
  private deterministicFormat(content: string, title?: string, isHtml?: boolean): string {
    // Treść z .docx jest już strukturalnym HTML (tabele/nagłówki/listy) - zachowaj ją.
    if (isHtml) {
      const trimmedTitle = title?.trim();
      const needsTitle = trimmedTitle && !/^\s*<h1\b/i.test(content);
      const prefix = needsTitle ? `<h1>${this.escape(trimmedTitle!)}</h1>` : '';
      return sanitizeDocumentHtml(`${prefix}${content}`);
    }
    const heading = title?.trim() || content.split('\n')[0]?.slice(0, 80) || 'Dokument';
    const paragraphs = content
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((p) => `<p>${this.escape(p)}</p>`)
      .join('');
    return sanitizeDocumentHtml(
      `<h1>${this.escape(heading)}</h1><h2>Sekcja</h2>${paragraphs || '<p></p>'}`,
    );
  }

  /** Deterministyczna edycja dla trybu E2E - np. pogrubienie nagłówków. */
  private deterministicEdit(currentHtml: string, instruction: string): string {
    let html = currentHtml;
    if (/pogrub/i.test(instruction)) {
      html = html.replace(/<h([123])>(.*?)<\/h\1>/g, '<h$1><strong>$2</strong></h$1>');
    }
    html += '<p><em>Zaktualizowano przez AI.</em></p>';
    return sanitizeDocumentHtml(html);
  }

  /** Escapuje znaki specjalne HTML. */
  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
