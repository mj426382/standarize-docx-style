import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

/**
 * "Wypieka" numerację Worda (numbering.xml) jako zwykły tekst wewnątrz akapitów .docx.
 *
 * Problem: numeracja nagłówków/list w Wordzie nie jest tekstem - jest definicją w
 * numbering.xml dowiązaną przez <w:numPr>. mammoth ją pomija, więc numery ("1.", "1.1",
 * "2.") znikają po konwersji do HTML. Tutaj liczymy faktyczne numery (jak silnik Worda)
 * i wstawiamy je na stałe na początek tekstu akapitu, a następnie usuwamy <w:numPr>,
 * aby nie powstała podwójna numeracja. Dzięki temu numery są częścią treści i nie da się
 * ich już zgubić - ani przez mammoth, ani przez LLM.
 *
 * Bezpieczne: każdy błąd parsowania zwraca oryginalny bufor (brak regresji).
 */
export async function injectDocxNumbering(buffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file('word/document.xml');
    const numberingXml = await zip.file('word/numbering.xml')?.async('string');
    if (!docFile || !numberingXml) {
      return buffer; // brak dokumentu lub brak definicji numeracji - nic do zrobienia
    }
    const documentXml = await docFile.async('string');
    const stylesXml = await zip.file('word/styles.xml')?.async('string');

    const parser = new DOMParser();
    const numbering = parseNumbering(parser.parseFromString(numberingXml, 'text/xml') as unknown as Document);
    const styleNum = stylesXml
      ? parseStyles(parser.parseFromString(stylesXml, 'text/xml') as unknown as Document)
      : new Map<string, StyleNum>();

    const dom = parser.parseFromString(documentXml, 'text/xml') as unknown as Document;
    const changed = applyNumbering(dom, numbering, styleNum);
    if (!changed) {
      return buffer;
    }

    zip.file('word/document.xml', new XMLSerializer().serializeToString(dom as any));
    return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer;
  } catch {
    return buffer;
  }
}

interface Lvl {
  numFmt: string;
  lvlText: string;
  start: number;
}

interface Numbering {
  numToAbstract: Map<string, string>;
  overrides: Map<string, Map<number, number>>;
  abstract: Map<string, Map<number, Lvl>>;
}

interface StyleNum {
  numId?: string;
  ilvl: number;
  basedOn?: string;
}

/** Pierwsze dziecko-element o danej nazwie (bez schodzenia w głąb). */
function directChild(el: Element, name: string): Element | null {
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === 1 && node.nodeName === name) {
      return node as Element;
    }
  }
  return null;
}

/** Parsuje numbering.xml: mapy numId->abstractId, definicje poziomów, nadpisania startu. */
function parseNumbering(doc: Document): Numbering {
  const abstractMap = new Map<string, Map<number, Lvl>>();
  const abstractNums = doc.getElementsByTagName('w:abstractNum');
  for (let i = 0; i < abstractNums.length; i++) {
    const el = abstractNums[i];
    const id = el.getAttribute('w:abstractNumId');
    if (id == null) continue;
    const levels = new Map<number, Lvl>();
    const lvls = el.getElementsByTagName('w:lvl');
    for (let j = 0; j < lvls.length; j++) {
      const lvl = lvls[j];
      const ilvl = parseInt(lvl.getAttribute('w:ilvl') ?? '0', 10);
      levels.set(ilvl, {
        numFmt: directChild(lvl, 'w:numFmt')?.getAttribute('w:val') ?? 'decimal',
        lvlText: directChild(lvl, 'w:lvlText')?.getAttribute('w:val') ?? '',
        start: parseInt(directChild(lvl, 'w:start')?.getAttribute('w:val') ?? '1', 10),
      });
    }
    abstractMap.set(id, levels);
  }

  const numToAbstract = new Map<string, string>();
  const overrides = new Map<string, Map<number, number>>();
  const nums = doc.getElementsByTagName('w:num');
  for (let i = 0; i < nums.length; i++) {
    const el = nums[i];
    const numId = el.getAttribute('w:numId');
    if (numId == null) continue;
    const abs = directChild(el, 'w:abstractNumId')?.getAttribute('w:val');
    if (abs != null) numToAbstract.set(numId, abs);
    const ovs = el.getElementsByTagName('w:lvlOverride');
    for (let j = 0; j < ovs.length; j++) {
      const ov = ovs[j];
      const ilvl = parseInt(ov.getAttribute('w:ilvl') ?? '0', 10);
      const so = directChild(ov, 'w:startOverride')?.getAttribute('w:val');
      if (so != null) {
        if (!overrides.has(numId)) overrides.set(numId, new Map());
        overrides.get(numId)!.set(ilvl, parseInt(so, 10));
      }
    }
  }

  return { numToAbstract, overrides, abstract: abstractMap };
}

/** Parsuje styles.xml: które style akapitowe niosą numerację (z łańcuchem basedOn). */
function parseStyles(doc: Document): Map<string, StyleNum> {
  const map = new Map<string, StyleNum>();
  const styles = doc.getElementsByTagName('w:style');
  for (let i = 0; i < styles.length; i++) {
    const st = styles[i];
    const id = st.getAttribute('w:styleId');
    if (id == null) continue;
    const basedOn = directChild(st, 'w:basedOn')?.getAttribute('w:val') ?? undefined;
    const pPr = directChild(st, 'w:pPr');
    const numPr = pPr ? directChild(pPr, 'w:numPr') : null;
    const numId = numPr ? (directChild(numPr, 'w:numId')?.getAttribute('w:val') ?? undefined) : undefined;
    const ilvl = numPr ? parseInt(directChild(numPr, 'w:ilvl')?.getAttribute('w:val') ?? '0', 10) : 0;
    map.set(id, { numId, ilvl, basedOn });
  }
  return map;
}

/** Rozwiązuje numerację stylu, schodząc po łańcuchu basedOn. */
function resolveStyleNum(
  styleId: string,
  styles: Map<string, StyleNum>,
  depth = 0,
): { numId: string; ilvl: number } | null {
  if (depth > 10) return null;
  const s = styles.get(styleId);
  if (!s) return null;
  if (s.numId) return { numId: s.numId, ilvl: s.ilvl };
  if (s.basedOn) return resolveStyleNum(s.basedOn, styles, depth + 1);
  return null;
}

/** Wstawia numery jako tekst do ponumerowanych akapitów i zdejmuje <w:numPr>. */
function applyNumbering(
  dom: Document,
  numbering: Numbering,
  styles: Map<string, StyleNum>,
): boolean {
  const counters = new Map<string, number[]>();
  const paras = dom.getElementsByTagName('w:p');
  let changed = false;

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    const pPr = directChild(p, 'w:pPr');
    const numPr = pPr ? directChild(pPr, 'w:numPr') : null;

    let numId: string | undefined;
    let ilvl = 0;
    if (numPr) {
      numId = directChild(numPr, 'w:numId')?.getAttribute('w:val') ?? undefined;
      ilvl = parseInt(directChild(numPr, 'w:ilvl')?.getAttribute('w:val') ?? '0', 10);
    } else if (pPr) {
      const pStyle = directChild(pPr, 'w:pStyle')?.getAttribute('w:val');
      if (pStyle) {
        const resolved = resolveStyleNum(pStyle, styles);
        if (resolved) {
          numId = resolved.numId;
          ilvl = resolved.ilvl;
        }
      }
    }

    if (!numId || numId === '0') continue;
    const absId = numbering.numToAbstract.get(numId);
    if (!absId) continue;
    const levels = numbering.abstract.get(absId);
    const lvl = levels?.get(ilvl);
    if (!levels || !lvl) continue;
    if (lvl.numFmt === 'bullet' || lvl.numFmt === 'none') continue; // punktory zostawiamy

    const arr = counters.get(numId) ?? [];
    const startVal = numbering.overrides.get(numId)?.get(ilvl) ?? lvl.start ?? 1;
    arr[ilvl] = (arr[ilvl] ?? startVal - 1) + 1;
    for (let j = ilvl + 1; j < arr.length; j++) arr[j] = undefined as unknown as number;
    counters.set(numId, arr);

    const text = renderLvlText(lvl.lvlText, arr, levels);
    if (!text.trim()) continue;

    const run = dom.createElement('w:r');
    const t = dom.createElement('w:t');
    t.setAttribute('xml:space', 'preserve');
    t.appendChild(dom.createTextNode(`${text} `));
    run.appendChild(t);

    const ref = pPr ? pPr.nextSibling : p.firstChild;
    p.insertBefore(run, ref);
    if (numPr && numPr.parentNode) numPr.parentNode.removeChild(numPr);
    changed = true;
  }

  return changed;
}

/** Buduje tekst numeru z szablonu lvlText (np. "%1.%2") wg formatów poszczególnych poziomów. */
function renderLvlText(template: string, arr: number[], levels: Map<number, Lvl>): string {
  return template.replace(/%(\d)/g, (_m, d: string) => {
    const idx = parseInt(d, 10) - 1;
    const fmt = levels.get(idx)?.numFmt ?? 'decimal';
    const value = arr[idx] ?? levels.get(idx)?.start ?? 1;
    return formatNumber(value, fmt);
  });
}

/** Formatuje liczbę wg formatu Worda (decimal/litery/rzymskie). */
function formatNumber(n: number, fmt: string): string {
  switch (fmt) {
    case 'lowerLetter':
      return toLetter(n).toLowerCase();
    case 'upperLetter':
      return toLetter(n).toUpperCase();
    case 'lowerRoman':
      return toRoman(n).toLowerCase();
    case 'upperRoman':
      return toRoman(n);
    default:
      return String(n);
  }
}

/** 1 -> A, 2 -> B, ... 27 -> AA. */
function toLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || 'A';
}

/** Liczba arabska -> rzymska (wersalikami). */
function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const table: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let x = n;
  let out = '';
  for (const [v, sym] of table) {
    while (x >= v) {
      out += sym;
      x -= v;
    }
  }
  return out;
}
