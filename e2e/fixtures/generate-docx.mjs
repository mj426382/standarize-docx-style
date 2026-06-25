// Generuje plik fixtures/sample.docx na potrzeby testów uploadu.
// Uruchom raz przed testami: `node fixtures/generate-docx.mjs`
// Wymaga pakietu html-to-docx (dostępnego w backend/node_modules) lub zainstaluj lokalnie.
import HTMLtoDOCX from 'html-to-docx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html><html><body>
  <h1>Raport miesięczny — przykładowy dokument</h1>
  <h2>Wprowadzenie</h2>
  <p>Przykładowa treść dokumentu .docx do testów formatowania.</p>
  <ul><li>Punkt pierwszy</li><li>Punkt drugi</li></ul>
</body></html>`;

const buffer = await HTMLtoDOCX(html);
writeFileSync(join(__dirname, 'sample.docx'), buffer);
// eslint-disable-next-line no-console
console.log('fixtures/sample.docx wygenerowany.');
