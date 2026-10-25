import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-10 y CA-11 (T-103, T-104, SPEC-005): pantallas informativas «Próximamente» de la cuenta.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

const admin = adminClient();
let credentials: Credentials;

test.beforeAll(async () => {
  credentials = newCredentials('coming-soon');
  await createConfirmedUser(admin, credentials);
});

test.afterAll(async () => {
  await deleteUserByEmail(admin, credentials.email);
});

async function enter(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
}

const PAGES = [{ path: '/cuenta/club', label: 'Trama Club' }] as const;

test('sin sesión redirigen al acceso', async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/acceso/);
  }
});

for (const { path, label } of PAGES) {
  test(`${label}: informativa, sin formularios, con su entrada marcada en la barra`, async ({ page }) => {
    await enter(page, 1280);
    await page.getByTestId('account-nav').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    const card = page.getByTestId('coming-soon');
    await expect(card.getByText('Próximamente')).toBeVisible();
    await expect(card.locator('form, input, button')).toHaveCount(0);
    await expect(page.getByTestId('account-nav').getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`${label}: sin scroll horizontal a ${width} px`, async ({ page }) => {
      await enter(page, width);
      await page.goto(path);
      await expect(page.getByTestId('coming-soon')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}
