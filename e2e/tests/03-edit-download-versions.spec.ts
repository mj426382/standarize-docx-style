import { test, expect } from '@playwright/test';
import { registerNewUser, createTextDocument } from './helpers';

test.describe('Edycja, pobranie i wersje', () => {
  test('edycja przez prompt tworzy nową wersję', async ({ page }) => {
    await registerNewUser(page);
    await createTextDocument(page, 'Dokument do edycji', 'Tytuł\n\nTreść akapitu.');
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    const versionsBefore = await page.getByTestId('version-list').locator('li').count();

    await page.getByTestId('prompt-input').fill('pogrub wszystkie nagłówki');
    await page.getByTestId('prompt-submit').click();

    // Powinna pojawić się nowa wersja.
    await expect(async () => {
      const after = await page.getByTestId('version-list').locator('li').count();
      expect(after).toBeGreaterThan(versionsBefore);
    }).toPass({ timeout: 30_000 });
  });

  test('edycja ręczna w TipTap i zapis', async ({ page }) => {
    await registerNewUser(page);
    await createTextDocument(page, 'Dokument ręczny', 'Tytuł\n\nTreść.');
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    await page.getByRole('button', { name: 'Edycja ręczna' }).click();
    const editor = page.getByTestId('tiptap-editor').locator('.ProseMirror');
    await editor.click();
    await editor.pressSequentially(' Dodany tekst ręczny.', { delay: 50 });
    await page.getByTestId('save-manual-btn').click();
    await expect(page.getByTestId('document-preview')).toContainText('Dodany tekst ręczny.', {
      timeout: 15_000,
    });
  });

  test('pobranie pliku .docx', async ({ page }) => {
    await registerNewUser(page);
    await createTextDocument(page, 'Dokument do pobrania', 'Tytuł\n\nTreść.');
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  test('pobranie pliku z polskimi znakami w tytule', async ({ page }) => {
    await registerNewUser(page);
    // Tytuł z polskimi znakami diakrytycznymi - wcześniej powodował 500
    // (Invalid character in header content) przy generowaniu Content-Disposition.
    await createTextDocument(page, 'Zażółć gęślą jaźń', 'Tytuł\n\nTreść.');
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  test('historia wersji i przywracanie', async ({ page }) => {
    await registerNewUser(page);
    await createTextDocument(page, 'Dokument z wersjami', 'Tytuł\n\nTreść.');
    await expect(page.getByTestId('status')).toHaveText('Gotowy', { timeout: 30_000 });

    // Wykonujemy edycję, by powstała druga wersja.
    await page.getByTestId('prompt-input').fill('pogrub nagłówki');
    await page.getByTestId('prompt-submit').click();
    await expect(async () => {
      const count = await page.getByTestId('version-list').locator('li').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 30_000 });

    // Przywracamy najstarszą wersję.
    await page
      .getByTestId('version-list')
      .locator('li')
      .last()
      .getByRole('button', { name: 'Przywróć' })
      .click();
    await expect(async () => {
      const count = await page.getByTestId('version-list').locator('li').count();
      expect(count).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 30_000 });
  });
});
