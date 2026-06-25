/**
 * Port (interfejs domenowy) dla usługi LLM formatującej dokumenty.
 * Implementacje (adaptery) znajdują się w warstwie infrastruktury.
 */
export interface LlmPort {
  /**
   * Sformatuj treść źródłową w spójny dokument HTML wg reguł formatowania.
   * `content` może być czystym tekstem (wklejka/.txt) lub HTML wyekstrahowanym z .docx
   * (wtedy `isHtml = true` - zachowaj tabele, listy i nagłówki).
   */
  formatDocument(input: {
    content: string;
    title?: string;
    isHtml?: boolean;
    /** Metadane fragmentu przy dzieleniu długiego dokumentu (dla spójności między fragmentami). */
    chunk?: { index: number; total: number };
    /** Wspólny przewodnik stylu (wyprowadzony z całego pliku) - zapewnia spójność między fragmentami. */
    styleGuide?: string;
  }): Promise<string /* HTML */>;
  /**
   * Analizuje CAŁY dokument i zwraca zwięzły przewodnik stylu (decyzje formatowania),
   * stosowany następnie jednolicie przy formatowaniu wszystkich fragmentów.
   */
  deriveStyleGuide(content: string): Promise<string>;
  /** Edytuj istniejący dokument HTML wg polecenia użytkownika (minimalna zmiana). */
  editDocument(input: { currentHtml: string; instruction: string }): Promise<string /* HTML */>;
}

/** Token DI dla LlmPort. */
export const LLM_PORT = Symbol('LLM_PORT');
