// Generator sitemap.xml. Czyta slugi z plików postów i tworzy public/sitemap.xml.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://dokformat.pl';
const POSTS_DIR = join(__dirname, '..', 'src', 'data', 'blogPosts');
const PUBLIC_DIR = join(__dirname, '..', 'public');

/** Statyczne trasy serwisu. */
const staticRoutes = ['/', '/blog', '/regulamin', '/polityka-prywatnosci'];

/** Wyciąga slug z pliku posta. */
function extractSlug(content) {
  const match = content.match(/slug:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/** Buduje pojedynczy wpis URL. */
function urlEntry(loc, priority) {
  return `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`;
}

function generate() {
  const postFiles = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.ts'));
  const slugs = postFiles
    .map((file) => extractSlug(readFileSync(join(POSTS_DIR, file), 'utf-8')))
    .filter(Boolean);

  const entries = [
    ...staticRoutes.map((route) => urlEntry(route, route === '/' ? '1.0' : '0.7')),
    ...slugs.map((slug) => urlEntry(`/blog/${slug}`, '0.6')),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    '\n',
  )}\n</urlset>\n`;

  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`sitemap.xml wygenerowany (${entries.length} adresów URL).`);
}

generate();
