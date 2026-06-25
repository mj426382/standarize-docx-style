import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import HTMLtoDOCX from 'html-to-docx';
import { DocumentConverterPort } from '../ports/document-converter.port';
import { sanitizeDocumentHtml } from '../html-sanitizer';
import { injectDocxNumbering } from '../docx-numbering';

/** Obsługiwane typy MIME wejściowych plików. */
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_TXT = 'text/plain';

/**
 * Adapter konwersji dokumentów: mammoth (.docx -> tekst) oraz html-to-docx (HTML -> .docx).
 * HTML jest sanityzowany na wejściu i wyjściu (whitelist tagów).
 */
@Injectable()
export class DocxConverterService implements DocumentConverterPort {
  /**
   * Konwertuje plik wejściowy na treść do dalszego formatowania.
   * .docx -> strukturalny HTML (zachowuje tabele, nagłówki, listy); .txt -> czysty tekst.
   * @throws Error gdy typ MIME nie jest obsługiwany.
   */
  async fileToContent(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ content: string; isHtml: boolean }> {
    if (mimeType === MIME_DOCX) {
      // Najpierw "wypiekamy" numerację Worda jako tekst (mammoth gubi numerację nagłówków/list),
      // potem convertToHtml zachowuje strukturę (tabele, nagłówki, listy) wraz z numerami.
      const withNumbers = await injectDocxNumbering(buffer);
      const result = await mammoth.convertToHtml({ buffer: withNumbers });
      return { content: result.value.trim(), isHtml: true };
    }
    if (mimeType === MIME_TXT) {
      return { content: buffer.toString('utf-8').trim(), isHtml: false };
    }
    throw new Error(`Nieobsługiwany typ pliku: ${mimeType}`);
  }

  /**
   * Generuje plik .docx z sanityzowanego, sformatowanego HTML.
   * Dokleja inline'owe style tabel (html-to-docx honoruje tylko style inline, nie <style>),
   * aby pobrany plik wyglądał spójnie z podglądem (obramowania, nagłówek, spójna czcionka).
   */
  async htmlToDocx(html: string): Promise<Buffer> {
    const safe = sanitizeDocumentHtml(html);
    const styled = this.applyDocxStyles(safe);
    const full = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${styled}</body></html>`;
    const result = await HTMLtoDOCX(full, undefined, {
      table: { row: { cantSplit: true } },
      font: 'Calibri',
      fontSize: 22, // half-points => 11pt, jak w podglądzie
      footer: false,
      header: false,
    });
    return Buffer.isBuffer(result) ? result : Buffer.from(result as ArrayBuffer);
  }

  /**
   * Dokleja inline'owe style do bloków, by pobrany .docx miał spójne wcięcia, odstępy
   * i wyrównanie (html-to-docx ignoruje <style>/klasy, czyta wyłącznie style inline,
   * więc bez tego stosuje niespójne domyślne style nagłówków/akapitów/list).
   */
  private applyDocxStyles(html: string): string {
    return html
      // Nagłówki: jednolite, lewe wyrównanie, brak wcięcia, spójne odstępy nad/pod.
      .replace(/<h1\b/g, '<h1 style="margin:0 0 10px 0;text-indent:0;text-align:left"')
      .replace(/<h2\b/g, '<h2 style="margin:18px 0 8px 0;text-indent:0;text-align:left"')
      .replace(/<h3\b/g, '<h3 style="margin:14px 0 6px 0;text-indent:0;text-align:left"')
      .replace(/<h4\b/g, '<h4 style="margin:12px 0 6px 0;text-indent:0;text-align:left"')
      .replace(/<h5\b/g, '<h5 style="margin:10px 0 4px 0;text-indent:0;text-align:left"')
      .replace(/<h6\b/g, '<h6 style="margin:10px 0 4px 0;text-indent:0;text-align:left"')
      // Akapity: brak wcięcia pierwszej linii, jednolity odstęp, wyrównanie do lewej.
      .replace(/<p\b/g, '<p style="margin:0 0 8px 0;text-indent:0;text-align:left"')
      // Listy: jednolite wcięcie od lewej i odstęp, bez dodatkowych marginesów.
      .replace(/<ul\b/g, '<ul style="margin:0 0 8px 0;padding-left:24px"')
      .replace(/<ol\b/g, '<ol style="margin:0 0 8px 0;padding-left:24px"')
      .replace(/<li\b/g, '<li style="margin:0 0 4px 0;text-indent:0"')
      // Tabele: obramowania i wyróżniony nagłówek jak w podglądzie.
      .replace(/<table\b/g, '<table style="border-collapse:collapse;width:100%"')
      .replace(
        /<th\b/g,
        '<th style="border:1px solid #888;padding:5px;background-color:#f2f2f2;text-align:left;vertical-align:top"',
      )
      .replace(
        /<td\b/g,
        '<td style="border:1px solid #888;padding:5px;text-align:left;vertical-align:top"',
      );
  }
}
