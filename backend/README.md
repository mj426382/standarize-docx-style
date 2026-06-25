# DokFormat — Backend (NestJS API)

API formatowania dokumentów Word przy pomocy AI. Zbudowane w NestJS 10 + Prisma 5 + PostgreSQL.

## Architektura

Lekkie DDD + porty/adaptery (SOLID):

- **Warstwa aplikacji**: kontrolery (cienkie), DTO z walidacją na granicy systemu.
- **Warstwa domeny**: `DocumentsService` orkiestruje proces; porty `LlmPort`, `DocumentConverterPort`.
- **Warstwa infrastruktury**: adaptery `OpenAiLlmService`, `DocxConverterService`, `StorageService`, `PrismaService`.

```
src/
├── auth/         # rejestracja, logowanie, Google OAuth, JWT
├── users/        # profil użytkownika
├── prisma/       # PrismaService (global)
├── storage/      # B2 (S3) + fallback lokalny
└── documents/    # RDZEŃ: porty, adaptery, serwis, kontroler
    ├── ports/            # LlmPort, DocumentConverterPort (interfejsy)
    └── adapters/         # OpenAiLlmService, DocxConverterService
```

## Quick Start

```bash
cp .env.example .env   # uzupełnij sekrety
npm install
npx prisma generate
npx prisma migrate dev   # lub: npx prisma db push
npm run start:dev
```

API: `http://localhost:3000/api` — Swagger: `http://localhost:3000/api/docs`.

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Sekret do podpisu tokenów JWT |
| `JWT_EXPIRES_IN` | Czas życia tokenu (domyślnie `7d`) |
| `OPENAI_API_KEY` | Klucz API OpenAI |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `B2_ENDPOINT` / `B2_BUCKET_NAME` / `B2_KEY_ID` / `B2_APPLICATION_KEY` / `B2_REGION` / `B2_PUBLIC_URL` | Storage B2 (puste = dysk lokalny) |
| `FRONTEND_URL` | URL frontendu (CORS) |
| `PORT` | Port nasłuchu (domyślnie `3000`) |
| `E2E` | `true` = deterministyczny adapter LLM (testy) |

## Endpointy

### Auth (`/api/auth`)
- `POST /register`, `POST /login`, `POST /google`, `POST /forgot-password`

### Users (`/api/users`)
- `GET /me`, `PATCH /me`

### Documents (`/api/documents`) — wymaga JWT
- `POST /text` — utwórz z wklejonego tekstu
- `POST /upload` — utwórz z pliku `.txt`/`.docx`
- `GET /` — lista (paginacja)
- `GET /:id` — szczegóły + najnowsza wersja
- `GET /:id/versions` — historia wersji
- `POST /:id/edit` — edycja przez prompt
- `PUT /:id/content` — zapis ręcznej edycji
- `POST /:id/restore/:versionNo` — przywróć wersję
- `GET /:id/download` — pobierz `.docx`
- `DELETE /:id` — usuń

## Testy

```bash
npm test            # unit (Jest)
npm run test:cov    # pokrycie
```

## Bezpieczeństwo (OWASP)

- Sanityzacja HTML (`sanitize-html`, whitelist tagów) na wejściu i wyjściu.
- Walidacja typów MIME i limit 10 MB dla uploadów.
- Throttling endpointów auth (`@nestjs/throttler`).
- Sekrety wyłącznie z ENV; hasła hashowane `bcrypt` (12 rund).
