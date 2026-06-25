# DokFormat — Frontend (panel aplikacji)

Panel zalogowanego użytkownika. React 18 + Vite 5 + TailwindCSS 3 + React Router 6 + TipTap.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:5173
```

W trybie dev żądania `/api` są proxowane do backendu na `http://localhost:3026`.

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `VITE_API_URL` | Bazowy URL API (domyślnie `/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID Google OAuth |

## Struktura

```
src/
├── services/api.ts      # axios + interceptory (token, 401), authApi/usersApi/documentsApi
├── hooks/useAuth.ts     # AuthContext + useAuthProvider
├── components/          # Layout, GoogleLoginButton, TipTapEditor, StatusBadge, Spinner
└── pages/               # Login, Register, ForgotPassword, Dashboard, NewDocument,
                         # DocumentEditor, Library, Regulamin, PolitykaPrywatnosci
```

## Kluczowe ekrany

- **Dashboard** — ostatnie dokumenty + CTA.
- **NewDocument** — zakładki „Wklej tekst" i „Wgraj plik" (react-dropzone).
- **DocumentEditor** — podgląd HTML (kartka A4), edycja przez prompt (AI), edycja ręczna
  (TipTap), pobranie `.docx`, historia wersji z przywracaniem, polling statusu `PROCESSING`.
- **Library** — pełna lista z akcjami (otwórz, pobierz, usuń).

## Build

```bash
npm run build
```
