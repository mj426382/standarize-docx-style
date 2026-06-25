# DokFormat — Testy E2E (Playwright)

Testy klikające po realnym UI aplikacji.

## Wymagania wstępne

1. Uruchom backend w trybie deterministycznym (bez realnych wywołań OpenAI):

   ```bash
   cd ../backend
   # w .env ustaw: E2E=true
   npm run start:dev
   ```

2. Uruchom frontend:

   ```bash
   cd ../frontend
   npm run dev      # http://localhost:5173
   ```

3. Wygeneruj fixture .docx (jednorazowo):

   ```bash
   node fixtures/generate-docx.mjs
   ```

## Uruchomienie testów

```bash
npm install
npx playwright install
npm test            # wszystkie projekty (chromium, firefox)
npm run test:headed # z widoczną przeglądarką
npm run report      # raport HTML
```

## Zakres testów

| Plik | Scenariusze |
|------|-------------|
| `01-auth.spec.ts` | rejestracja, walidacja siły hasła, wylogowanie i ponowne logowanie |
| `02-create-document.spec.ts` | tworzenie z tekstu, upload `.txt` i `.docx`, asercja podglądu |
| `03-edit-download-versions.spec.ts` | edycja przez prompt, edycja ręczna (TipTap), pobranie `.docx`, historia wersji i przywracanie |

## Izolacja LLM

Backend z `E2E=true` używa deterministycznego adaptera LLM (`OpenAiLlmService`), który zwraca
przewidywalny HTML bez wywołań sieciowych — testy są szybkie i powtarzalne.

## Zmienne

| Zmienna | Opis |
|---------|------|
| `E2E_BASE_URL` | URL frontendu (domyślnie `http://localhost:5173`) |
