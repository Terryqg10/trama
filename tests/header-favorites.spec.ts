import { expect, test } from '@playwright/test';

// CA-27 (T-114, Enmienda 4 de SPEC-005): corazón de favoritos en la cabecera.

test.describe('corazón de favoritos en la cabecera (CA-27)', () => {
  for (const width of [320, 375, 768, 1280]) {
    test(`a ${width} px es un enlace de 44 px a /cuenta/favoritos, antes de cuenta y cesta, sin desbordar`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const heart = page.getByTestId('favorites-link');
      await expect(heart).toBeVisible();
      await expect(heart).toHaveAttribute('href', '/cuenta/favoritos');
      await expect(heart).toHaveAccessibleName('Mis favoritos');
      const box = await heart.boundingBox();
      const cart = await page.getByTestId('cart-open').boundingBox();
      if (!box || !cart) throw new Error('sin medidas');
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.x).toBeLessThan(cart.x);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('sin sesión, al pulsarlo se llega al acceso', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('favorites-link').click();
    await expect(page).not.toHaveURL(/\/$/);
    await expect(page).toHaveURL(/login|acceso|cuenta/);
  });
});
