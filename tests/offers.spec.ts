import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// CA-02, CA-04 y CA-05 (T-100): `/ofertas` con las rebajas del seed (`catalog-discounts.sql`: abrigo de paño gris, etc.).
test.use({ hasTouch: false, isMobile: false });

test.describe('página de ofertas', () => {
  test('lista las prendas rebajadas con la tarjeta completa y el banner con el mayor descuento real', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/ofertas');
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    await expect(page.getByText(`${count} ${count === 1 ? 'producto' : 'productos'}`)).toBeVisible();
    // Todas llevan insignia de descuento y precio anterior tachado.
    await expect(page.getByTestId('discount-badge')).toHaveCount(count);
    await expect(page.getByTestId('card-price-before')).toHaveCount(count);
    // Tarjeta completa: panel de tallas.
    await expect(page.getByTestId('quick-add').first()).toBeAttached();
    // El banner enseña el mayor porcentaje de las insignias.
    const percents = await page
      .getByTestId('discount-badge')
      .evaluateAll((items) => items.map((item) => Number((item.textContent ?? '').replace(/\D/g, ''))));
    const max = Math.max(...percents);
    await expect(page.getByTestId('offers-banner').getByRole('heading')).toContainText(`-${max}%`);
  });

  for (const width of [320, 375, 480, 600, 768, 1024, 1280]) {
    test(`sin scroll horizontal a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/ofertas');
      await expect(page.locator('article').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('axe sin violaciones graves', async ({ page }) => {
    await page.goto('/ofertas');
    await expect(page.locator('article').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
