import { test, expect } from '@playwright/test';
import { registerNewUser, uniqueEmail, STRONG_PASSWORD } from './helpers';

test.describe('Rejestracja i logowanie', () => {
  test('waliduje siłę hasła i blokuje słabe hasło', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Hasło').fill('abc');
    // Reguły powinny być oznaczone jako niespełnione.
    const rules = page.getByTestId('password-rule');
    await expect(rules.first()).toBeVisible();

    await page.getByLabel('E-mail').fill(uniqueEmail());
    await page.getByRole('button', { name: 'Utwórz konto' }).click();
    // Pozostajemy na stronie rejestracji (hasło nie spełnia wymagań).
    await expect(page).toHaveURL(/\/register/);
  });

  test('rejestruje, wylogowuje i loguje ponownie', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/register');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Hasło').fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Utwórz konto' }).click();
    await expect(page).toHaveURL('/');

    // Wylogowanie.
    await page.getByRole('button', { name: 'Wyloguj się' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Ponowne logowanie.
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Hasło').fill(STRONG_PASSWORD);
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();
    await expect(page).toHaveURL('/');
  });

  test('pomocnik registerNewUser działa', async ({ page }) => {
    await registerNewUser(page);
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  });
});
