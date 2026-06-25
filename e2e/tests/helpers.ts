import { Page, expect } from '@playwright/test';

/** Generuje unikalny adres e-mail dla testu. */
export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

/** Silne hasło spełniające reguły rejestracji. */
export const STRONG_PASSWORD = 'Silne#Haslo1';

/**
 * Rejestruje nowego użytkownika przez UI i czeka na pulpit.
 * @returns użyty adres e-mail.
 */
export async function registerNewUser(page: Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto('/register');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Hasło').fill(STRONG_PASSWORD);
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await expect(page).toHaveURL('/');
  return email;
}

/** Tworzy dokument z wklejonego tekstu i czeka na ekran edytora. */
export async function createTextDocument(page: Page, title: string, text: string): Promise<void> {
  await page.goto('/new');
  await page.getByRole('button', { name: 'Wklej tekst' }).click();
  await page.getByLabel('Tytuł (opcjonalnie)').fill(title);
  await page.getByLabel('Treść').fill(text);
  await page.getByRole('button', { name: 'Sformatuj' }).click();
  await expect(page).toHaveURL(/\/document\//);
}
