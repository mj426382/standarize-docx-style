import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja Playwright dla testów UI DokFormat.
 * baseURL wskazuje na frontend; serwery uruchom ręcznie wg README lub przez `webServer`.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  /**
   * Aby auto-startować serwery, ustaw zmienne i odkomentuj poniższe.
   * Wymaga backendu z E2E=true (deterministyczny adapter LLM).
   */
  // webServer: [
  //   { command: 'npm --prefix ../backend run start:dev', port: 3026, reuseExistingServer: true },
  //   { command: 'npm --prefix ../frontend run dev', port: 5173, reuseExistingServer: true },
  // ],
});
