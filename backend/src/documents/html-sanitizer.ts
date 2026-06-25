import sanitizeHtml from 'sanitize-html';

/** Dozwolone tagi w sformatowanym dokumencie (whitelist - ochrona przed XSS). */
export const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'strong',
  'em',
  'br',
];

/** Konfiguracja sanitize-html wspólna dla wejścia i wyjścia. */
export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // Zezwalamy wyłącznie na atrybuty scalania komórek tabel (colspan/rowspan),
  // aby zachować strukturę tabel z .docx (np. nagłówki rozpięte na wiele kolumn).
  allowedAttributes: {
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  disallowedTagsMode: 'discard',
};

/**
 * Sanityzuje HTML wg whitelisty tagów, usuwając skrypty, style inline i niebezpieczne atrybuty.
 */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}
