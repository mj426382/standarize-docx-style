import { test, expect } from '@playwright/test';
import { registerNewUser, createTextDocument } from './helpers';

test.describe('Tworzenie dokumentu', () => {
  test('z wklejonego tekstu — podgląd zawiera nagłówki i akapity', async ({ page }) => {
    await registerNewUser(page);
    await createTextDocument(
      page,
      'Raport testowy',
      'Wprowadzenie do raportu.\n\nPierwszy akapit treści.\n\nDrugi akapit treści.',
    );

    // Czekamy aż status będzie Gotowy.
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    const preview = page.getByTestId('document-preview');
    await expect(preview.locator('h1')).toBeVisible();
    await expect(preview.locator('p').first()).toBeVisible();
  });

  test('upload pliku .txt — podgląd dokumentu', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/new');
    await page.getByRole('button', { name: 'Wgraj plik' }).click();
    await page.getByTestId('file-input').setInputFiles('fixtures/sample.txt');
    await page.getByRole('button', { name: 'Sformatuj' }).click();
    await expect(page).toHaveURL(/\/document\//);
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });
    await expect(page.getByTestId('document-preview').locator('h1')).toBeVisible();
  });

  test('upload pliku .docx — podgląd dokumentu', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/new');
    await page.getByRole('button', { name: 'Wgraj plik' }).click();
    await page.getByTestId('file-input').setInputFiles('fixtures/sample.docx');
    await page.getByRole('button', { name: 'Sformatuj' }).click();
    await expect(page).toHaveURL(/\/document\//);
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });
  });
});
