import { test, expect } from '@playwright/test';
import { ACTION_NAV, LEGAL_NAV, MAIN_NAV } from '../src/lib/domain/navigation';

const ROUTES = [
  '/',
  ...MAIN_NAV.map((item) => item.href),
  ACTION_NAV.cart.href,
  ACTION_NAV.account.href,
  ...LEGAL_NAV.map((item) => item.href),
];

test.describe('logo (CA-20, test logo-home)', () => {
  for (const route of ROUTES) {
    test(`el logo enlaza a / desde ${route}`, async ({ page }) => {
      await page.goto(route);
      const logo = page.locator('header').getByRole('link', { name: 'Trama, ir al inicio' });
      await expect(logo).toHaveAttribute('href', '/');
      if (route !== '/') {
        await logo.click();
        await expect(page).toHaveURL(/\/$/);
      }
    });
  }
});

test.describe('navegación sin enlaces muertos (puerta 7)', () => {
  for (const route of ROUTES) {
    test(`${route} responde 200`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  test('todos los enlaces internos de la home resuelven', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((anchors) =>
      anchors.map((a) => a.getAttribute('href') ?? ''),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of new Set(hrefs)) {
      const response = await request.get(href);
      expect(response.status(), `enlace ${href}`).toBe(200);
    }
  });
});

test.describe('cabecera en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('muestra los enlaces principales y Novedades y Ofertas', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    for (const item of MAIN_NAV) {
      await expect(nav.getByRole('link', { name: item.label })).toBeVisible();
    }
  });

  test('los controles de la cabecera miden al menos 44×44 px', async ({ page }) => {
    await page.goto('/');
    const controls = page.locator('header').locator('a:visible, button:visible');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box, `control ${i}`).not.toBeNull();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('menú móvil', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('se abre, se cierra con Escape y devuelve el foco al botón', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Abrir menú' });
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Menú móvil' });
    await expect(menu).toBeVisible();
    for (const item of MAIN_NAV) {
      await expect(menu.getByRole('link', { name: item.label })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
  });

  test('se cierra al hacer clic fuera', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const menu = page.getByRole('navigation', { name: 'Menú móvil' });
    await expect(menu).toBeVisible();
    await page.locator('main').click({ position: { x: 5, y: 200 } });
    await expect(menu).toBeHidden();
  });

  test('se cierra al elegir un enlace y navega', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('navigation', { name: 'Menú móvil' }).getByRole('link', { name: 'Ofertas' }).click();
    await expect(page).toHaveURL(/\/ofertas$/);
    await expect(page.getByRole('navigation', { name: 'Menú móvil' })).toBeHidden();
  });

  test('no hay desbordamiento horizontal a 390 px', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
