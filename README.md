# DokFormat — AI formatowanie dokumentów Word

DokFormat to aplikacja SaaS, która zamienia surowy tekst, plik `.txt` lub `.docx` w **pięknie
sformatowany dokument Word** (`.docx`) oraz podgląd HTML — z możliwością poprawiania przez prompt
i ręcznej edycji w edytorze WYSIWYG.

> Domena marketingowa: `dokformat.pl` · Aplikacja: `app.dokformat.pl`

## Co robi aplikacja

1. Wklejasz tekst, wgrywasz `.txt` lub `.docx`.
2. AI (OpenAI `gpt-4o-mini`) nadaje treści spójny układ: nagłówki, akapity, listy, tabele.
3. Widzisz podgląd HTML i pobierasz gotowy plik `.docx`.
4. Poprawiasz dokument poleceniem (np. „pogrub nagłówki sekcji") — zasada minimalnej zmiany.
5. Edytujesz ręcznie w edytorze TipTap i zapisujesz.
6. Każda wersja jest zapisywana — możesz wrócić do poprzedniej.

Logowanie i rejestracja: email + hasło (walidacja siły), Google OAuth, reset hasła, JWT, throttling.

## Struktura monorepo

```
├── backend/        # NestJS API + Prisma + PostgreSQL
├── frontend/       # Panel użytkownika (React + Vite + Tailwind + TipTap)
├── landing-page/   # Strona marketingowa (React + Vite + Tailwind, SEO, blog, sitemap)
├── infra/          # docker-compose (dev + prod)
├── e2e/            # Testy end-to-end (Playwright)
└── README.md
```

## Architektura (SOLID + lekkie DDD)

LLM, storage, parsowanie/generowanie dokumentów i logika domenowa to oddzielne serwisy wstrzykiwane
przez DI. Domena dokumentu zależy od **portów** (`LlmPort`, `DocumentConverterPort`), a konkretne
**adaptery** (`OpenAiLlmService`, `DocxConverterService`, `StorageService`) żyją w warstwie
infrastruktury. Kontrolery są cienką warstwą aplikacji.

## Quick Start (Docker, środowisko dev)

```bash
cd infra
cp .env.example .env      # uzupełnij OPENAI_API_KEY, JWT_SECRET, GOOGLE_CLIENT_ID
docker compose -f docker-compose.dev.yml up --build
```

Backend (`http://localhost:3026/api`) automatycznie zsynchronizuje schemat bazy (`prisma db push`).
Swagger: `http://localhost:3026/api/docs`.

Frontend i landing uruchamiasz lokalnie:

```bash
cd frontend && npm install && npm run dev          # http://localhost:5173
cd landing-page && npm install && npm run dev      # http://localhost:5174
```

## Quick Start (bez Dockera)

| Pakiet | Komendy |
|--------|---------|
| backend | `cp .env.example .env` → `npm install` → `npx prisma migrate dev` → `npm run start:dev` |
| frontend | `cp .env.example .env` → `npm install` → `npm run dev` |
| landing-page | `npm install` → `npm run dev` |
| e2e | `npm install` → `npx playwright install` → `npm test` |

## Zmienne środowiskowe (backend)

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Konfiguracja JWT (domyślny czas życia `7d`) |
| `OPENAI_API_KEY` | Klucz API OpenAI |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `B2_*` | Storage Backblaze B2 (puste = dysk lokalny `/app/uploads`) |
| `FRONTEND_URL` | URL frontendu (CORS) |
| `PORT` | Port API (domyślnie `3026`) |
| `E2E` | `true` = deterministyczny adapter LLM (testy) |

## Testy

```bash
cd backend && npm test        # Jest (unit + serwisy, cel ≥ 80% logiki domenowej)
cd e2e && npm test            # Playwright (UI)
```

## Bezpieczeństwo (OWASP Top 10)

- Sanityzacja HTML (`sanitize-html`, whitelist tagów) przed renderem i konwersją do `.docx` (XSS).
- Walidacja typów MIME i limit 10 MB dla uploadów.
- Throttling endpointów auth (`@nestjs/throttler`).
- Hasła hashowane `bcrypt` (12 rund); odpowiedzi `forgot-password` chronią przed enumeracją kont.
- Sekrety wyłącznie z ENV.

## Dokumentacja pakietów

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [landing-page/README.md](landing-page/README.md)
- [e2e/README.md](e2e/README.md)