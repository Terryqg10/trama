import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// CA-14, CA-15 y CA-16 (T-106, SPEC-005): sección «Trama en tu móvil» al final de la portada y diálogo «App no disponible».
test.use({ hasTouch: false, isMobile: false });

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.getByTestId('mobile-app').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('mobile-app')).toBeVisible();
}

test.describe('CA-14: la sección', () => {
  test('está al final de la portada, antes del pie, con el aviso de demostración como nota', async ({ page }) => {
    await open(page);
    const section = page.getByTestId('mobile-app');
    await expect(section.getByRole('heading', { level: 2, name: 'Trama en tu móvil' })).toBeVisible();
    await expect(page.getByTestId('mobile-app-note')).toHaveAttribute('role', 'note');
    await expect(page.getByTestId('mobile-app-note')).toHaveText('Trama es un proyecto de demostración: no existe una app real.');
    await expect(page.getByTestId('phone-mockup')).toBeVisible();
    const box = await section.boundingBox();
    const newsletter = await page.getByTestId('newsletter').boundingBox();
    const footer = await page.locator('footer').first().boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan((newsletter?.y ?? 0) + (newsletter?.height ?? 0) - 1);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((footer?.y ?? 0) + 1);
    await expect(section.getByTestId('store-button')).toHaveText(['App Store', 'Google Play']);
  });

  test('la portada sigue siendo estática: se sirve con caché y sin leer la sesión', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['x-nextjs-cache'] ?? response.headers()['cache-control'] ?? '').not.toMatch(/no-store|private/);
  });
});

test.describe('CA-15: los botones de tienda', () => {
  test('abren el diálogo «App no disponible», cerrable con Esc, X y clic fuera, con el foco devuelto', async ({ page }) => {
    await open(page);
    const first = page.getByTestId('store-button').first();
    await first.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByTestId('app-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('heading', { name: 'App no disponible' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Ver novedades' })).toHaveAttribute('href', '/novedades');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();

    await page.getByTestId('store-button').nth(1).click();
    await page.getByTestId('app-dialog-close').click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('store-button').first().click();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('el foco queda atrapado en el diálogo y «Ver novedades» lleva a /novedades', async ({ page }) => {
    await open(page);
    await page.getByTestId('store-button').first().click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => document.querySelector('[data-testid="app-dialog"]')?.contains(document.activeElement));
      expect(inside).toBe(true);
    }
    await page.getByTestId('app-dialog').getByRole('link', { name: 'Ver novedades' }).click();
    await expect(page).toHaveURL(/\/novedades$/);
  });

  test('ningún enlace de la sección apunta a una tienda real ni a «#»', async ({ page }) => {
    await open(page);
    const hrefs = await page.getByTestId('mobile-app').locator('a').evaluateAll((items) => items.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual([]);
  });
});

test.describe('CA-16: anchos y accesibilidad', () => {
  for (const width of [320, 375, 480, 600, 768, 1024, 1280]) {
    test(`sin scroll horizontal ni recortes a ${width} px`, async ({ page }) => {
      await open(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const box = await page.getByTestId('phone-mockup').boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      for (const button of await page.getByTestId('store-button').all()) {
        const b = await button.boundingBox();
        expect(b?.height ?? 0).toBeGreaterThanOrEqual(43.5);
        expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      }
    });
  }

  test('axe sin violaciones graves, con la sección y con el diálogo abierto', async ({ page }) => {
    // Sin animación: axe mediría el contraste a mitad del fundido de entrada.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    let axe = await new AxeBuilder({ page }).include('[data-testid="mobile-app"]').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await page.getByTestId('store-button').first().click();
    axe = await new AxeBuilder({ page }).include('[data-testid="app-dialog"]').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  test('sin movimiento con prefers-reduced-motion en el diálogo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.getByTestId('store-button').first().click();
    const animation = await page.getByTestId('app-dialog').evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });
});
