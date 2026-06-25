# DokFormat — Landing page

Strona marketingowa. React 18 + Vite + TailwindCSS + react-helmet-async + system blogowy.

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5174
```

## Build (z generowaniem sitemap)

```bash
npm run build    # node scripts/generate-sitemap.js && tsc && vite build
```

## Struktura

```
src/
├── components/   # Navbar, Footer
├── pages/        # Home, Blog, BlogPost, Regulamin, PolitykaPrywatnosci
└── data/
    ├── blogPost.ts       # typ BlogPostData
    ├── blogPosts.ts      # agregator wszystkich postów
    └── blogPosts/        # post-1.ts ... post-8.ts (po jednym pliku na wpis)
scripts/
└── generate-sitemap.js   # czyta slugi i tworzy public/sitemap.xml
```

## SEO

- `react-helmet-async` — title, meta description, Open Graph na stronie głównej i wpisach.
- Dynamiczny `public/sitemap.xml` generowany przed buildem.
- `public/robots.txt` ze wskazaniem sitemap.

## Dodanie nowego wpisu

1. Utwórz `src/data/blogPosts/post-N.ts` eksportujący `post: BlogPostData`.
2. Dodaj import w `src/data/blogPosts.ts`.
3. Uruchom `npm run sitemap` (lub `npm run build`).
