import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-12 y CA-13 (T-105, SPEC-005): modal de acceso desde el icono de usuario de la cabecera. Crea usuarios de prueba que se
// borran al terminar. Se prueba con ratón y sin emulación táctil.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);
test.use({ hasTouch: false, isMobile: false });

const admin = adminClient();
const createdEmails: string[] = [];

test.afterAll(async () => {
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

async function newUser(label: string): Promise<Credentials> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  await createConfirmedUser(admin, credentials);
  return credentials;
}

async function openModal(page: Page, width = 1280, path = '/novedades'): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(path);
  await page.getByTestId('account-open').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
}

async function fillLogin(page: Page, credentials: Credentials, password = credentials.password): Promise<void> {
  const modal = page.getByTestId('auth-modal');
  await modal.getByLabel('Email').fill(credentials.email);
  await modal.getByLabel('Contraseña').fill(password);
  await modal.locator('form').getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
}

test.describe('CA-12: el modal', () => {
  test('el icono de usuario sin sesión abre un diálogo modal accesible con dos pestañas', async ({ page }) => {
    await openModal(page);
    const modal = page.getByTestId('auth-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal.getByRole('tab')).toHaveText(['Iniciar sesión', 'Crear cuenta']);
    await expect(page.getByTestId('auth-tab-login')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.getByTestId('auth-tab-register').click();
    await expect(modal.getByLabel('Nombre')).toBeVisible();
    await expect(page.getByTestId('auth-tab-register')).toHaveAttribute('aria-selected', 'true');
    const axe = await new AxeBuilder({ page }).include('[data-testid="auth-modal"]').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  test('se cierra con Esc, con la X y con un clic en el fondo, y el foco vuelve al icono', async ({ page }) => {
    // Se abre con el teclado: WebKit no da foco a un enlace al pulsarlo con el ratón.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/novedades');
    await page.getByTestId('account-open').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('auth-modal')).toBeHidden();
    await expect(page.getByTestId('account-open')).toBeFocused();
    await page.getByTestId('account-open').click();
    await page.getByTestId('auth-modal-close').click();
    await expect(page.getByTestId('auth-modal')).toBeHidden();
    await page.getByTestId('account-open').click();
    await page.mouse.click(5, 400);
    await expect(page.getByTestId('auth-modal')).toBeHidden();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('el foco queda atrapado dentro del modal', async ({ page }) => {
    await openModal(page);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => document.querySelector('[data-testid="auth-modal"]')?.contains(document.activeElement));
      expect(inside).toBe(true);
    }
  });

  test('desde 768 px la imagen está a la izquierda del formulario; por debajo no hay imagen', async ({ page }) => {
    await openModal(page, 1280);
    const image = await page.getByTestId('auth-modal-image').boundingBox();
    const form = await page.getByTestId('auth-modal').locator('form').boundingBox();
    expect((image?.x ?? 0) + (image?.width ?? 0)).toBeLessThanOrEqual((form?.x ?? 0) + 1);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 375, height: 800 });
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await expect(page.getByTestId('auth-modal-image')).toBeHidden();
  });

  test('sin movimiento con prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openModal(page);
    const animation = await page.getByTestId('auth-modal').evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });

  for (const width of [320, 375, 600, 768, 1024, 1280]) {
    test(`sin scroll horizontal y dentro del viewport a ${width} px`, async ({ page }) => {
      await openModal(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const box = await page.getByTestId('auth-modal').boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    });
  }
});

test.describe('CA-13: sesión, errores y carrito', () => {
  test('un error de credenciales se anuncia dentro del modal y no lo cierra; después entra y va a /cuenta', async ({ page }) => {
    const credentials = await newUser('modal-login');
    await openModal(page);
    await fillLogin(page, credentials, 'contraseña-equivocada-1');
    await expect(page.getByTestId('auth-modal').getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await fillLogin(page, credentials);
    await expect(page).toHaveURL(/\/cuenta(\?carrito=fusionado)?$/);
    await expect(page.getByTestId('auth-modal')).toHaveCount(0);
  });

  test('con sesión, el icono lleva a /cuenta sin abrir el modal', async ({ page }) => {
    const credentials = await newUser('modal-session');
    await page.goto('/acceso');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/cuenta$/);
    await page.goto('/novedades');
    await page.getByTestId('account-open').click();
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByTestId('auth-modal')).toHaveCount(0);
  });

  test('el carrito de invitado se fusiona con la cuenta al entrar por el modal', async ({ page }) => {
    const credentials = await newUser('modal-cart');
    await page.goto('/producto/polo-pique-basico?color=negro&talla=M');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('auth-modal')).toBeVisible();
    await fillLogin(page, credentials);
    await expect(page).toHaveURL(/\/cuenta\?carrito=fusionado$/);
  });

  test('en /acceso el icono navega y no abre el modal', async ({ page }) => {
    await page.goto('/acceso');
    await page.getByTestId('account-open').click();
    await expect(page.getByTestId('auth-modal')).toHaveCount(0);
  });
});
