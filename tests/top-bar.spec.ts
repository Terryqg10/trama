import { expect, test } from '@playwright/test';

// CA-81 (T-046) y CA-94 (T-053): barra de anuncios sobre la cabecera de la tienda, con la colección de otoño y el
// envío gratis desde el umbral real (50,00 €, RF-22). No aparece en el panel admin.

const WIDTHS = [320, 375, 768, 1280] as const;
const PAGES = ['/', '/hombre', '/mujer', '/novedades', '/carrito', '/acceso'] as const;

test.describe('barra de anuncios (CA-81, CA-94)', () => {
  for (const url of PAGES) {
    test(`${url}: está sobre la cabecera con la colección y el umbral real`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url);
      const bar = page.getByTestId('top-bar');
      await expect(bar).toBeVisible();
      await expect(bar).toContainText('Nueva colección Otoño/Invierno ya disponible');
      await expect(bar).toContainText('Envío gratis a partir de 50,00 €');
      // El importe equivocado de la petición original (49,99 €) no puede aparecer.
      await expect(bar).not.toContainText('49,99');

      const barBox = await bar.boundingBox();
      const headerBox = await page.locator('header').first().boundingBox();
      expect(barBox?.y ?? -1).toBeLessThanOrEqual(0.5);
      expect((barBox?.y ?? 0) + (barBox?.height ?? 0)).toBeLessThanOrEqual((headerBox?.y ?? 0) + 1);
    });
  }

  for (const width of WIDTHS) {
    test(`a ${width} px el texto cabe sin recortes ni scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const bar = page.getByTestId('top-bar');
      await expect(bar).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
      // Ningún mensaje se sale de la ventana.
      const fits = await bar.locator('span').evaluateAll((spans, viewport) =>
        spans.every((span) => {
          const rect = span.getBoundingClientRect();
          return rect.width === 0 || (rect.left >= -0.5 && rect.right <= viewport + 0.5);
        }),
        width,
      );
      expect(fits).toBe(true);
    });
  }

  test('el texto cumple el contraste AA: accent-fg sobre accent (≥ 4,5:1)', async ({ page }) => {
    await page.goto('/');
    const colors = await page.getByTestId('top-bar').evaluate((el) => ({
      fg: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
    }));
    const parse = (value: string) => (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value) ?? []).slice(1, 4).map(Number);
    const lin = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const lum = (rgb: number[]) => 0.2126 * lin(rgb[0] ?? 0) + 0.7152 * lin(rgb[1] ?? 0) + 0.0722 * lin(rgb[2] ?? 0);
    const a = lum(parse(colors.fg));
    const b = lum(parse(colors.bg));
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  test('el texto mínimo es de 12 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const size = await page.getByTestId('top-bar').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(12);
  });
});
