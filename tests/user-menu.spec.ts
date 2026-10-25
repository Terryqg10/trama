import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-17 a CA-20 (T-107, Enmienda 1 de SPEC-005): menú desplegable del icono de usuario. Crea un usuario de prueba con nombre
// que se borra al terminar. Se prueba con ratón y sin emulación táctil.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);
test.use({ hasTouch: false, isMobile: false });

const admin = adminClient();
let credentials: Credentials;
const NAME = 'Ana Prueba';

test.beforeAll(async () => {
  credentials = newCredentials('user-menu');
  const id = await createConfirmedUser(admin, credentials);
  const updated = await admin.from('profiles').update({ full_name: NAME }).eq('id', id);
  if (updated.error) throw new Error(updated.error.message);
});

test.afterAll(async () => {
  await deleteUserByEmail(admin, credentials.email);
});

async function signIn(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto('/novedades');
}

async function openMenu(page: Page): Promise<void> {
  await page.getByTestId('account-open').click();
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

test.describe('CA-17: el menú con sesión', () => {
  test('el icono lo abre bajo sí mismo, con el saludo y las cuatro entradas, sin navegar', async ({ page }) => {
    await signIn(page);
    const trigger = page.getByTestId('account-open');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await openMenu(page);
    await expect(page).toHaveURL(/\/novedades$/);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByTestId('user-menu');
    await expect(menu).toHaveAttribute('role', 'menu');
    await expect(page.getByTestId('user-menu-greeting')).toHaveText(`Hola, ${NAME}`);
    await expect(menu.getByRole('menuitem')).toHaveText(['Mis datos', 'Mis pedidos', 'Trama Club', 'Cerrar sesión']);
    const t = await trigger.boundingBox();
    const m = await menu.boundingBox();
    expect(m?.y ?? 0).toBeGreaterThanOrEqual((t?.y ?? 0) + (t?.height ?? 0));
    expect((m?.x ?? 0) + (m?.width ?? 0)).toBeLessThanOrEqual((t?.x ?? 0) + (t?.width ?? 0) + 1);
  });
});

test.describe('CA-18 y CA-19: cierre y teclado', () => {
  test('se cierra con un clic fuera y con Esc (el foco vuelve al icono) y al pulsar el icono', async ({ page }) => {
    await signIn(page);
    await openMenu(page);
    await page.mouse.click(5, 400);
    await expect(page.getByTestId('user-menu')).toBeHidden();
    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('user-menu')).toBeHidden();
    await expect(page.getByTestId('account-open')).toBeFocused();
    await openMenu(page);
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('user-menu')).toBeHidden();
  });

  test('la primera entrada recibe el foco, las flechas recorren y Tab cierra', async ({ page }) => {
    await signIn(page);
    await page.getByTestId('account-open').focus();
    await page.keyboard.press('Enter');
    const menu = page.getByTestId('user-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Mis datos' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Mis pedidos' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(menu.getByRole('menuitem', { name: 'Mis datos' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();
  });

  test('cada entrada lleva a su destino y «Cerrar sesión» cierra la sesión', async ({ page }) => {
    await signIn(page);
    for (const [name, url] of [
      ['Mis datos', /\/cuenta$/],
      ['Mis pedidos', /\/cuenta\/pedidos$/],
      ['Trama Club', /\/cuenta\/club$/],
    ] as const) {
      await openMenu(page);
      await page.getByTestId('user-menu').getByRole('menuitem', { name }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByTestId('user-menu')).toBeHidden();
    }
    await openMenu(page);
    await page.getByTestId('user-menu').getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/cuenta');
    await expect(page).toHaveURL(/\/acceso/);
  });

  test('axe sin violaciones graves con el menú abierto', async ({ page }) => {
    await signIn(page);
    await openMenu(page);
    const axe = await new AxeBuilder({ page }).include('[data-testid="user-menu"]').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});

test.describe('CA-20: sin sesión y anchos', () => {
  test('sin sesión el icono abre el modal de acceso y no el menú', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/novedades');
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await expect(page.getByTestId('user-menu')).toHaveCount(0);
  });

  test('sin JavaScript el icono es un enlace a /cuenta', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/novedades');
    await expect(page.getByTestId('account-open')).toHaveAttribute('href', '/cuenta');
    await context.close();
  });

  for (const width of [320, 375, 480, 600, 768, 1024, 1280]) {
    test(`el menú queda dentro del viewport y sin scroll horizontal a ${width} px`, async ({ page }) => {
      await signIn(page, width);
      await openMenu(page);
      const box = await page.getByTestId('user-menu').boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
