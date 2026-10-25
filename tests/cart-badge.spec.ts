import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-21 a CA-24 (T-108, Enmienda 2 de SPEC-005): contador de unidades en el icono de la cesta. El carrito de invitado se
// siembra en `localStorage`; el de la cuenta se prueba con un usuario de prueba que se borra al terminar.
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);
test.use({ hasTouch: false, isMobile: false });

const CART_KEY = 'trama.cart.v1';
const POLO = '/producto/polo-pique-basico?color=negro&talla=M';
const admin = adminClient();
const createdEmails: string[] = [];

test.afterAll(async () => {
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

const badge = (page: Page) => page.getByTestId('cart-count');
const cartLink = (page: Page) => page.getByTestId('cart-open');

async function seedGuestCart(page: Page, lines: { variantId: string; qty: number }[]): Promise<void> {
  await page.goto('/novedades');
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
      window.dispatchEvent(new Event('trama:cart-change'));
    },
    [CART_KEY, JSON.stringify(lines)],
  );
}

async function firstVariantId(page: Page): Promise<string> {
  await page.goto(POLO);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as { variantId: string }[], CART_KEY);
  const id = saved[0]?.variantId;
  if (!id) throw new Error('no se pudo leer la variante');
  return id;
}

test.describe('CA-21 y CA-24: invitado', () => {
  test('sin unidades no hay badge y el nombre del enlace es «Carrito»', async ({ page }) => {
    await page.goto('/novedades');
    await expect(cartLink(page)).toHaveAttribute('aria-label', 'Carrito');
    await expect(badge(page)).toHaveCount(0);
  });

  test('1, 9 y 10 unidades: «1», «9» y «9+»; cuenta unidades y el nombre accesible lo dice', async ({ page }) => {
    const variantId = await firstVariantId(page);
    await page.keyboard.press('Escape');
    await seedGuestCart(page, [{ variantId, qty: 1 }]);
    await expect(badge(page)).toHaveText('1');
    await expect(cartLink(page)).toHaveAttribute('aria-label', 'Carrito, 1 artículo');
    await seedGuestCart(page, [{ variantId, qty: 9 }]);
    await expect(badge(page)).toHaveText('9');
    await expect(cartLink(page)).toHaveAttribute('aria-label', 'Carrito, 9 artículos');
    await seedGuestCart(page, [{ variantId, qty: 10 }]);
    await expect(badge(page)).toHaveText('9+');
    await expect(cartLink(page)).toHaveAttribute('aria-label', 'Carrito, 10 artículos');
  });

  test('el badge es decorativo y no intercepta el clic: abre el carrito lateral', async ({ page }) => {
    const variantId = await firstVariantId(page);
    await page.keyboard.press('Escape');
    await seedGuestCart(page, [{ variantId, qty: 2 }]);
    await expect(badge(page)).toBeVisible();
    await expect(badge(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(badge(page)).toHaveCSS('pointer-events', 'none');
    const box = await badge(page).boundingBox();
    await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2);
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    const fontSize = await badge(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });
});

test.describe('CA-22: invitado añade y quita', () => {
  test('cambia al momento al añadir y al quitar, y se conserva al recargar', async ({ page }) => {
    await page.goto(POLO);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await expect(badge(page)).toHaveText('1');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(badge(page)).toHaveText('1');
    await cartLink(page).click();
    await page.getByTestId('drawer-line').first().getByRole('button', { name: /del carrito/ }).click();
    await expect(badge(page)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(badge(page)).toHaveCount(0);
  });
});

test.describe('CA-23: con sesión', () => {
  test('refleja el carrito de la cuenta al añadir, navegar, recargar y quitar, y al cerrar sesión pasa al del navegador', async ({ page }) => {
    const credentials: Credentials = newCredentials('cart-badge');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);
    await page.goto('/acceso');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(badge(page)).toHaveCount(0);

    await page.goto(POLO);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await expect(badge(page)).toHaveText('1');
    await page.keyboard.press('Escape');
    await page.goto('/novedades');
    await expect(badge(page)).toHaveText('1');
    await page.reload();
    await expect(badge(page)).toHaveText('1');

    await page.goto(POLO);
    await page.getByTestId('add-to-cart').click();
    await expect(badge(page)).toHaveText('2');
    await page.keyboard.press('Escape');

    await cartLink(page).click();
    await page.getByTestId('drawer-line').first().getByRole('button', { name: /del carrito/ }).click();
    await expect(badge(page)).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto('/novedades');
    await page.getByTestId('account-open').click();
    await page.getByTestId('user-menu').getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(badge(page)).toHaveCount(0);
  });
});

test.describe('CA-24: anchos y accesibilidad', () => {
  for (const width of [320, 375, 480, 768, 1024, 1280]) {
    test(`el badge queda dentro del viewport y sin scroll horizontal a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const variantId = await firstVariantId(page);
      await page.keyboard.press('Escape');
      await seedGuestCart(page, [{ variantId, qty: 12 }]);
      await expect(badge(page)).toHaveText('9+');
      const box = await badge(page).boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('axe sin violaciones graves con el badge visible', async ({ page }) => {
    const variantId = await firstVariantId(page);
    await page.keyboard.press('Escape');
    await seedGuestCart(page, [{ variantId, qty: 3 }]);
    await expect(badge(page)).toBeVisible();
    const axe = await new AxeBuilder({ page }).include('header').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
