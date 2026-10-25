import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-07 a CA-09 (T-102, SPEC-005): navegación de la cuenta. Barra lateral desde 768 px y pestañas desplazables por debajo.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

const admin = adminClient();
let credentials: Credentials;

test.beforeAll(async () => {
  credentials = newCredentials('account-nav');
  await createConfirmedUser(admin, credentials);
});

test.afterAll(async () => {
  await deleteUserByEmail(admin, credentials.email);
});

async function enter(page: Page, width: number, path = '/cuenta'): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  if (path !== '/cuenta') await page.goto(path);
}

test('sin sesión cualquier /cuenta/* redirige al acceso', async ({ page }) => {
  for (const path of ['/cuenta', '/cuenta/pedidos', '/cuenta/favoritos']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/acceso/);
  }
});

test('a 1280 px es una columna lateral a la izquierda del contenido, con la activa marcada', async ({ page }) => {
  await enter(page, 1280, '/cuenta/pedidos');
  const nav = page.getByTestId('account-nav');
  const navBox = await nav.boundingBox();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect((navBox?.x ?? 0) + (navBox?.width ?? 0)).toBeLessThanOrEqual((heading?.x ?? 0) + 1);
  await expect(nav.getByRole('link', { name: 'Mis pedidos' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  for (const link of await nav.getByRole('link').all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
});

test('a 375 px son pestañas horizontales sin scroll de página', async ({ page }) => {
  await enter(page, 375, '/cuenta/favoritos');
  const nav = page.getByTestId('account-nav');
  const navBox = await nav.boundingBox();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect((navBox?.y ?? 0) + (navBox?.height ?? 0)).toBeLessThanOrEqual((heading?.y ?? 0) + 1);
  await expect(nav.getByRole('link', { name: 'Mis favoritos' })).toHaveAttribute('aria-current', 'page');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('cada entrada lleva a su página y «Cerrar sesión» cierra la sesión', async ({ page }) => {
  await enter(page, 1280);
  const nav = page.getByTestId('account-nav');
  await nav.getByRole('link', { name: 'Mis pedidos' }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
  await nav.getByRole('link', { name: 'Mis favoritos' }).click();
  await expect(page).toHaveURL(/\/cuenta\/favoritos$/);
  await nav.getByRole('link', { name: 'Mis datos' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await nav.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/cuenta');
  await expect(page).toHaveURL(/\/acceso/);
});

for (const width of [320, 375, 480, 600, 767, 768, 1024, 1280]) {
  test(`las páginas de la cuenta no desbordan a ${width} px`, async ({ page }) => {
    await enter(page, width);
    for (const path of ['/cuenta', '/cuenta/pedidos', '/cuenta/favoritos', '/cuenta/direcciones/nueva']) {
      await page.goto(path);
      await expect(page.getByTestId('account-nav')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} a ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}
