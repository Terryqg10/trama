import { test, expect, type Page } from '@playwright/test';
import { ACTION_NAV, MAIN_NAV } from '../src/lib/domain/navigation';

// SPEC-001 Enmienda 6 / T-013: menú móvil a pantalla completa (CA-46 a CA-50).

const MOBILE = { width: 375, height: 812 };

const trigger = (page: Page) => page.locator('[data-testid="menu-open"]');
const overlay = (page: Page) => page.locator('[data-testid="menu-overlay"]');

async function open(page: Page, url: string, viewport = MOBILE): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(url);
  await expect(page.getByRole('main')).toBeVisible();
}

async function focusInsideOverlay(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[data-testid="menu-overlay"]');
    return dialog?.contains(document.activeElement) ?? false;
  });
}

test.describe('CA-46: el icono de menú abre un overlay a 100dvh', () => {
  test('ocupa todo el viewport, es modal y el fondo no se desplaza', async ({ page }) => {
    await open(page, '/');
    await expect(overlay(page)).toBeHidden();
    await trigger(page).click();

    await expect(overlay(page)).toBeVisible();
    await expect(overlay(page)).toHaveAttribute('role', 'dialog');
    await expect(overlay(page)).toHaveAttribute('aria-modal', 'true');
    const box = await overlay(page).boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.width).toBe(MOBILE.width);
      expect(box.height).toBe(MOBILE.height);
    }
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  });

  test('cabecera con logo y X; enlaces grandes; pie con cuenta y carrito', async ({ page }) => {
    await open(page, '/ofertas');
    await trigger(page).click();
    const menu = page.getByRole('navigation', { name: 'Menú móvil' });
    await expect(overlay(page).getByRole('link', { name: 'Trama, ir al inicio' })).toBeVisible();
    await expect(overlay(page).getByRole('link', { name: 'Cerrar menú' })).toBeVisible();

    for (const item of MAIN_NAV) {
      const link = menu.getByRole('link', { name: item.label });
      await expect(link).toBeVisible();
      const fontSize = await link.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize, `tamaño de fuente de ${item.label}`).toBeGreaterThanOrEqual(20);
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    // El destino actual se marca con aria-current y con el color de acento.
    await expect(menu.getByRole('link', { name: 'Ofertas' })).toHaveAttribute('aria-current', 'page');

    await expect(overlay(page).getByRole('link', { name: ACTION_NAV.account.label })).toBeVisible();
    await expect(overlay(page).getByRole('link', { name: ACTION_NAV.cart.label })).toBeVisible();
  });

  test('abrir y cerrar no recarga el documento ni deja # en la URL', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga?: boolean }).__sinRecarga = true;
    });
    await trigger(page).click();
    await expect(overlay(page)).toBeVisible();
    await page.locator('[data-testid="menu-close"]').click();
    await expect(overlay(page)).toBeHidden();
    const marca = await page.evaluate(
      () => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga,
    );
    expect(marca).toBe(true);
    expect(page.url()).not.toContain('#');
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect(trigger(page)).toBeFocused();
  });

  test('el botón de cerrar mide al menos 44×44 px', async ({ page }) => {
    await open(page, '/');
    await trigger(page).click();
    const box = await page.locator('[data-testid="menu-close"]').boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('sin desbordamiento horizontal a 320, 375 y 767 px con el menú abierto', async ({
    page,
  }) => {
    for (const width of [320, 375, 767]) {
      await open(page, '/', { width, height: MOBILE.height });
      await trigger(page).click();
      await expect(overlay(page)).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, `desbordamiento a ${width} px`).toBe(false);
    }
  });
});

test.describe('CA-47: Esc cierra el overlay', () => {
  test('se cierra y el foco vuelve al icono de menú', async ({ page }) => {
    await open(page, '/');
    await trigger(page).click();
    await expect(overlay(page)).toBeVisible();
    await expect(page.locator('[data-testid="menu-close"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(overlay(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});

test.describe('CA-48: el foco no sale del overlay', () => {
  test('con Tab y con Mayús+Tab', async ({ page }) => {
    await open(page, '/');
    await trigger(page).click();
    await expect(overlay(page)).toBeVisible();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      expect(await focusInsideOverlay(page), `tabulación ${i + 1} fuera del overlay`).toBe(true);
    }
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusInsideOverlay(page), `Mayús+Tab ${i + 1} fuera del overlay`).toBe(true);
    }
  });
});

test.describe('hash #menu-movil con JavaScript', () => {
  test('entrar con el hash abre el overlay; Esc lo cierra y limpia el hash', async ({ page }) => {
    await open(page, '/#menu-movil');
    await expect(overlay(page)).toBeVisible();
    await expect(page.locator('[data-testid="menu-close"]')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(overlay(page)).toBeHidden();
    expect(page.url()).not.toContain('#');
  });
});

test.describe('CA-49: sin JavaScript el overlay se abre con #menu-movil', () => {
  test('el hash abre el overlay con CSS :target y el enlace del menú navega', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: MOBILE,
    });
    const page = await context.newPage();
    await page.goto('/#menu-movil');
    await expect(overlay(page)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Menú móvil' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Menú móvil' }).getByRole('link', { name: 'Ofertas' }).click();
    await expect(page).toHaveURL(/\/ofertas$/);
    await expect(overlay(page)).toBeHidden();
    await context.close();
  });

  test('el enlace «Cerrar menú» lo cierra sin JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: MOBILE,
    });
    const page = await context.newPage();
    await page.goto('/#menu-movil');
    await expect(overlay(page)).toBeVisible();
    await page.locator('[data-testid="menu-close"]').click();
    await expect(overlay(page)).toBeHidden();
    await context.close();
  });

  test('sin el hash el overlay está cerrado y el icono de menú lo abre', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: MOBILE,
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(overlay(page)).toBeHidden();
    await trigger(page).click();
    await expect(overlay(page)).toBeVisible();
    await context.close();
  });
});

test.describe('CA-50: en escritorio el menú es horizontal, sin overlay', () => {
  test('hay navegación en la cabecera, sin icono de menú ni overlay', async ({ page }) => {
    await open(page, '/', { width: 1280, height: 800 });
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav).toBeVisible();
    for (const item of MAIN_NAV) {
      await expect(nav.getByRole('link', { name: item.label })).toBeVisible();
    }
    await expect(trigger(page)).toBeHidden();
    await expect(overlay(page)).toBeHidden();
  });

  test('el hash no abre nada en escritorio', async ({ page }) => {
    await open(page, '/#menu-movil', { width: 1280, height: 800 });
    await expect(overlay(page)).toBeHidden();
  });

  test('a 768 px (límite) ya es horizontal; a 767 px es overlay', async ({ page }) => {
    await open(page, '/', { width: 768, height: 800 });
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await expect(trigger(page)).toBeHidden();
    await open(page, '/', { width: 767, height: 800 });
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden();
    await expect(trigger(page)).toBeVisible();
  });

  test('ensanchar la pantalla con el menú abierto lo cierra y libera el scroll', async ({
    page,
  }) => {
    await open(page, '/');
    await trigger(page).click();
    await expect(overlay(page)).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(overlay(page)).toBeHidden();
    // El scroll se libera en un efecto, justo después de pintar.
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe('hidden');
  });
});
