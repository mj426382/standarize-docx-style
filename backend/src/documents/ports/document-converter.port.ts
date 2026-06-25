/**
 * Port (interfejs domenowy) dla konwersji dokumentów.
 * Wejście: .docx -> strukturalny HTML (tabele/nagłówki/listy), .txt -> czysty tekst; wyjście: HTML -> .docx.
 */
export interface DocumentConverterPort {
  /**
   * Ekstrahuje treść z pliku wejściowego.
   * .docx -> strukturalny HTML (zachowuje tabele, nagłówki, listy), isHtml = true.
   * .txt  -> czysty tekst, isHtml = false.
   */
  fileToContent(buffer: Buffer, mimeType: string): Promise<{ content: string; isHtml: boolean }>;
  /** sformatowany HTML -> .docx (Buffer). */
  htmlToDocx(html: string): Promise<Buffer>;
}

/** Token DI dla DocumentConverterPort. */
export const DOCUMENT_CONVERTER_PORT = Symbol('DOCUMENT_CONVERTER_PORT');
