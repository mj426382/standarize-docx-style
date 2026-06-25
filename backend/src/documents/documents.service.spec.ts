import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentSource, DocumentStatus, VersionOrigin } from '@prisma/client';
import { DocumentsService, UploadedFile } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LLM_PORT, LlmPort } from './ports/llm.port';
import { DOCUMENT_CONVERTER_PORT, DocumentConverterPort } from './ports/document-converter.port';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;
  let storage: jest.Mocked<Pick<StorageService, 'uploadFile' | 'getFileBuffer' | 'deleteFile'>>;
  let llm: jest.Mocked<LlmPort>;
  let converter: jest.Mocked<DocumentConverterPort>;

  beforeEach(async () => {
    prisma = {
      document: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      documentVersion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    storage = {
      uploadFile: jest.fn().mockResolvedValue('documents/key.docx'),
      getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('docx')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    llm = {
      formatDocument: jest.fn().mockResolvedValue('<h1>Tytuł</h1><p>Treść</p>'),
      editDocument: jest.fn().mockResolvedValue('<h1>Tytuł</h1><p>Edytowane</p>'),
      deriveStyleGuide: jest.fn().mockResolvedValue('- h2 sekcje, h3 podsekcje\n- zachowaj numerację'),
    };
    converter = {
      fileToContent: jest.fn().mockResolvedValue({ content: 'surowy tekst', isHtml: false }),
      htmlToDocx: jest.fn().mockResolvedValue(Buffer.from('docx-bytes')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: LLM_PORT, useValue: llm },
        { provide: DOCUMENT_CONVERTER_PORT, useValue: converter },
      ],
    }).compile();

    service = moduleRef.get(DocumentsService);
  });

  describe('createFromText (happy path)', () => {
    it('tworzy .docx z tekstu bez AI i oznacza COMPLETED', async () => {
      prisma.document.create.mockResolvedValue({ id: 'doc1', title: 'Tytuł' });
      prisma.documentVersion.findFirst.mockResolvedValue(null);
      prisma.documentVersion.create.mockResolvedValue({ id: 'v1', versionNo: 1 });
      prisma.document.update.mockResolvedValue({});

      const result = await service.createFromText('user1', { rawText: 'Jakiś tekst' });

      expect(result.id).toBe('doc1');
      expect(llm.formatDocument).not.toHaveBeenCalled();
      expect(converter.htmlToDocx).toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DocumentStatus.COMPLETED }),
        }),
      );
      expect(storage.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('.docx'),
        expect.any(String),
        'documents',
      );
    });
  });

  describe('standardizeStyle', () => {
    it('ujednolica styl przez AI i tworzy wersję AI_FORMAT', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'user1', title: 'T' });
      prisma.documentVersion.findFirst
        .mockResolvedValueOnce({ versionNo: 2, html: '<p>x</p>', docxUrl: 'documents/k.docx' })
        .mockResolvedValueOnce({ versionNo: 2 });
      converter.fileToContent.mockResolvedValue({ content: '<p>x</p>', isHtml: true });
      prisma.documentVersion.create.mockResolvedValue({ id: 'v3', versionNo: 3 });
      prisma.document.update.mockResolvedValue({});
      prisma.document.findUniqueOrThrow.mockResolvedValue({
        id: 'doc1',
        title: 'T',
        status: DocumentStatus.COMPLETED,
        sourceType: DocumentSource.DOCX,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          { versionNo: 3, html: '', origin: VersionOrigin.AI_FORMAT, createdAt: new Date() },
        ],
      });

      const result = await service.standardizeStyle('user1', 'doc1');

      expect(llm.formatDocument).toHaveBeenCalled();
      expect(converter.htmlToDocx).toHaveBeenCalled();
      expect(result.latestVersion?.origin).toBe(VersionOrigin.AI_FORMAT);
    });

    it('dzieli długi dokument na spójne fragmenty (tylko pierwszy z tytułem)', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'user1', title: 'T' });
      const block = `<p>${'x'.repeat(500)}</p>`;
      const longHtml = block.repeat(120); // ~60k znaków -> ponad próg pojedynczego żądania
      prisma.documentVersion.findFirst
        .mockResolvedValueOnce({ versionNo: 1, html: '', docxUrl: 'documents/k.docx' })
        .mockResolvedValueOnce({ versionNo: 1 });
      converter.fileToContent.mockResolvedValue({ content: longHtml, isHtml: true });
      llm.formatDocument.mockImplementation(async (i: any) => i.content);
      prisma.documentVersion.create.mockResolvedValue({ id: 'v2', versionNo: 2 });
      prisma.document.update.mockResolvedValue({});
      prisma.document.findUniqueOrThrow.mockResolvedValue({
        id: 'doc1',
        title: 'T',
        status: DocumentStatus.COMPLETED,
        sourceType: DocumentSource.DOCX,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          { versionNo: 2, html: '', origin: VersionOrigin.AI_FORMAT, createdAt: new Date() },
        ],
      });

      await service.standardizeStyle('user1', 'doc1');

      // Przewodnik stylu wyprowadzony raz z całego pliku i przekazany do każdego fragmentu.
      expect(llm.deriveStyleGuide).toHaveBeenCalledTimes(1);
      const calls = llm.formatDocument.mock.calls.map((c: any[]) => c[0]);
      expect(calls.length).toBeGreaterThan(1);
      expect(calls[0].title).toBe('T');
      expect(calls[0].chunk.index).toBe(0);
      expect(calls[0].styleGuide).toBeTruthy();
      expect(calls[1].title).toBeUndefined();
      expect(calls[1].chunk.index).toBe(1);
      expect(calls[1].styleGuide).toBe(calls[0].styleGuide);
      expect(calls[0].chunk.total).toBe(calls.length);
    });

    it('zapieka numerację <ol> jako tekst zanim trafi do AI (numery nie giną)', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'user1', title: 'T' });
      const source =
        '<ol><li><strong>Wystawienie oferty</strong></li></ol>' +
        '<p>opis</p>' +
        '<ol><li>Pierwszy</li><li>Drugi<ol><li>Zagnieżdżony</li></ol></li></ol>';
      prisma.documentVersion.findFirst
        .mockResolvedValueOnce({ versionNo: 1, html: '', docxUrl: 'documents/k.docx' })
        .mockResolvedValueOnce({ versionNo: 1 });
      converter.fileToContent.mockResolvedValue({ content: source, isHtml: true });
      let sentToAi = '';
      llm.formatDocument.mockImplementation(async (i: any) => {
        sentToAi = i.content;
        return i.content;
      });
      prisma.documentVersion.create.mockResolvedValue({ id: 'v2', versionNo: 2 });
      prisma.document.update.mockResolvedValue({});
      prisma.document.findUniqueOrThrow.mockResolvedValue({
        id: 'doc1',
        title: 'T',
        status: DocumentStatus.COMPLETED,
        sourceType: DocumentSource.DOCX,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          { versionNo: 2, html: '', origin: VersionOrigin.AI_FORMAT, createdAt: new Date() },
        ],
      });

      await service.standardizeStyle('user1', 'doc1');

      // Numery są teraz zwykłym tekstem - AI ich nie zgubi.
      expect(sentToAi).toContain('1. ');
      expect(sentToAi).toContain('Wystawienie oferty');
      expect(sentToAi).toContain('2. ');
      expect(sentToAi).toContain('2.1. ');
      // <ol> zniknęło (zamienione na akapity z numerem), <ul> nie występuje tu wcale.
      expect(sentToAi).not.toContain('<ol>');
    });

    it('ujednolica poziom nagłówków wg głębokości numeracji (ten sam poziom = ten sam tag)', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'user1', title: 'T' });
      prisma.documentVersion.findFirst
        .mockResolvedValueOnce({ versionNo: 1, html: '', docxUrl: 'documents/k.docx' })
        .mockResolvedValueOnce({ versionNo: 1 });
      converter.fileToContent.mockResolvedValue({ content: '<p>x</p>', isHtml: true });
      // AI zwraca NIESPÓJNE poziomy: "1." jako h2, "2." jako h3, "1.1." jako p, "2.6." jako h2.
      llm.formatDocument.mockResolvedValue(
        '<h1>Tytuł</h1>' +
          '<h2>1. Pierwszy</h2>' +
          '<h3>2. Drugi</h3>' +
          '<p>1.1. Podpunkt</p>' +
          '<h2>2.6. Inny podpunkt</h2>',
      );
      let savedHtml = '';
      converter.htmlToDocx.mockImplementation(async (html: string) => {
        savedHtml = html;
        return Buffer.from('docx');
      });
      prisma.documentVersion.create.mockResolvedValue({ id: 'v2', versionNo: 2 });
      prisma.document.update.mockResolvedValue({});
      prisma.document.findUniqueOrThrow.mockResolvedValue({
        id: 'doc1',
        title: 'T',
        status: DocumentStatus.COMPLETED,
        sourceType: DocumentSource.DOCX,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          { versionNo: 2, html: '', origin: VersionOrigin.AI_FORMAT, createdAt: new Date() },
        ],
      });

      await service.standardizeStyle('user1', 'doc1');

      // Poziom 1 ("1.", "2.") -> h2; poziom 2 ("1.1.", "2.6.") -> h3.
      expect(savedHtml).toContain('<h2>1. Pierwszy</h2>');
      expect(savedHtml).toContain('<h2>2. Drugi</h2>');
      expect(savedHtml).toContain('<h3>1.1. Podpunkt</h3>');
      expect(savedHtml).toContain('<h3>2.6. Inny podpunkt</h3>');
      expect(savedHtml).toContain('<h1>Tytuł</h1>');
    });
  });

  describe('autoryzacja właściciela', () => {
    it('rzuca NotFound gdy dokument nie istnieje', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.getDocument('user1', 'doc1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rzuca Forbidden gdy dokument należy do innego użytkownika', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'inny' });
      await expect(service.getDocument('user1', 'doc1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('editByPrompt', () => {
    it('tworzy nową wersję AI_EDIT', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', userId: 'user1' });
      prisma.documentVersion.findFirst.mockResolvedValue({ versionNo: 1, html: '<h1>A</h1>' });
      prisma.documentVersion.create.mockResolvedValue({ id: 'v2', versionNo: 2 });
      prisma.document.update.mockResolvedValue({});
      prisma.document.findUniqueOrThrow.mockResolvedValue({
        id: 'doc1',
        title: 'T',
        status: DocumentStatus.COMPLETED,
        sourceType: DocumentSource.PASTE,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [{ versionNo: 2, html: '<h1>A</h1>', origin: VersionOrigin.AI_EDIT, createdAt: new Date() }],
      });

      const result = await service.editByPrompt('user1', 'doc1', 'pogrub nagłówki');
      expect(llm.editDocument).toHaveBeenCalled();
      expect(result.latestVersion?.origin).toBe(VersionOrigin.AI_EDIT);
    });
  });

  describe('createFromFile (walidacja)', () => {
    const baseFile: UploadedFile = {
      originalname: 'plik.txt',
      mimetype: 'text/plain',
      size: 100,
      buffer: Buffer.from('abc'),
    };

    it('odrzuca niedozwolony typ MIME', async () => {
      await expect(
        service.createFromFile('user1', { ...baseFile, mimetype: 'application/pdf' }),
      ).rejects.toThrow('Dozwolone są tylko pliki');
    });

    it('odrzuca zbyt duży plik', async () => {
      await expect(
        service.createFromFile('user1', { ...baseFile, size: 20 * 1024 * 1024 }),
      ).rejects.toThrow('zbyt duży');
    });
  });
});
