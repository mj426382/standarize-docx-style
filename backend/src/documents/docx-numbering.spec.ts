import JSZip from 'jszip';
import { injectDocxNumbering } from './docx-numbering';

/** Buduje minimalny .docx (zip) z numeracją Worda do testów. */
async function buildDocx(documentXml: string, numberingXml?: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', documentXml);
  if (numberingXml) zip.file('word/numbering.xml', numberingXml);
  return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer;
}

/** Wyciąga treść word/document.xml z bufora .docx. */
async function readDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file('word/document.xml')!.async('string');
}

const NUMBERING = `<?xml version="1.0"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

function para(text: string, ilvl?: number): string {
  const numPr =
    ilvl === undefined
      ? ''
      : `<w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr></w:pPr>`;
  return `<w:p>${numPr}<w:r><w:t>${text}</w:t></w:r></w:p>`;
}

describe('injectDocxNumbering', () => {
  it('wypieka numerację Worda jako tekst i usuwa w:numPr', async () => {
    const documentXml = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${para('Pierwszy', 0)}
    ${para('Akapit bez numeru')}
    ${para('Drugi', 0)}
    ${para('Podpunkt', 1)}
    ${para('Trzeci', 0)}
  </w:body>
</w:document>`;
    const buffer = await buildDocx(documentXml, NUMBERING);

    const out = await injectDocxNumbering(buffer);
    const xml = await readDocumentXml(out);

    expect(xml).toContain('1.');
    expect(xml).toContain('Pierwszy');
    expect(xml).toContain('2.');
    expect(xml).toContain('2.1.');
    expect(xml).toContain('Podpunkt');
    expect(xml).toContain('3.');
    // numeracja przeniesiona do tekstu - <w:numPr> zniknęło
    expect(xml).not.toContain('w:numPr');
  });

  it('zwraca oryginalny bufor gdy brak numbering.xml', async () => {
    const documentXml = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${para('Tekst')}</w:body>
</w:document>`;
    const buffer = await buildDocx(documentXml);

    const out = await injectDocxNumbering(buffer);

    expect(out).toBe(buffer);
  });

  it('zostawia punktory (bullet) bez zmian', async () => {
    const bulletNumbering = `<?xml version="1.0"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;
    const documentXml = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${para('Punkt', 0)}</w:body>
</w:document>`;
    const buffer = await buildDocx(documentXml, bulletNumbering);

    const out = await injectDocxNumbering(buffer);

    // Bez zmian (bullet) -> ten sam bufor.
    expect(out).toBe(buffer);
  });
});
