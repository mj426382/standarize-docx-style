import { DocxConverterService } from './docx-converter.service';

describe('DocxConverterService', () => {
  let service: DocxConverterService;

  beforeEach(() => {
    service = new DocxConverterService();
  });

  describe('fileToContent', () => {
    it('odczytuje treść z pliku tekstowego jako czysty tekst', async () => {
      const buffer = Buffer.from('Przykładowa treść', 'utf-8');
      const { content, isHtml } = await service.fileToContent(buffer, 'text/plain');
      expect(content).toBe('Przykładowa treść');
      expect(isHtml).toBe(false);
    });

    it('rzuca błąd dla nieobsługiwanego typu', async () => {
      await expect(service.fileToContent(Buffer.from('x'), 'application/pdf')).rejects.toThrow(
        'Nieobsługiwany typ pliku',
      );
    });
  });

  describe('htmlToDocx', () => {
    it('generuje niepusty bufor .docx z sanityzowanego HTML', async () => {
      const buffer = await service.htmlToDocx('<h1>Tytuł</h1><p>Treść</p><script>alert(1)</script>');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
