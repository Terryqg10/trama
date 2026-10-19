import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

// CA-69 (T-037): el Hero de la Home muestra la foto vertical en móvil y la horizontal en escritorio,
// con el texto legible (contraste AA) y sin scroll horizontal.

const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function currentImage(page: Page): Promise<string> {
  const img = page.locator('section picture img').first();
  await expect(img).toBeVisible();
  return img.evaluate(async (el) => {
    if (!(el instanceof HTMLImageElement)) return '';
    await el.decode().catch(() => undefined);
    return `${el.currentSrc}|${el.naturalWidth}`;
  });
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('Hero de la Home (CA-69)', () => {
  test('a 375 px usa la foto vertical y a 1280 px la horizontal, cargadas y sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const [mobileSrc, mobileWidth] = (await currentImage(page)).split('|');
    expect(mobileSrc).toMatch(/hero-pareja-vertical\.(avif|webp)$/);
    expect(Number(mobileWidth)).toBeGreaterThan(0);
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const [desktopSrc, desktopWidth] = (await currentImage(page)).split('|');
    expect(desktopSrc).toMatch(/hero-pareja-horizontal\.(avif|webp)$/);
    expect(Number(desktopWidth)).toBeGreaterThan(0);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('el texto y el CTA son visibles sin hacer scroll, y el CTA lleva al catálogo', async ({ page }) => {
    for (const [width, height] of [
      [375, 812],
      [1280, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Trama' })).toBeInViewport();
      const alt = await page.locator('section picture img').first().getAttribute('alt');
      expect((alt ?? '').trim().length).toBeGreaterThan(0);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Ver novedades' })).toBeInViewport();
    await page.getByRole('link', { name: 'Ver novedades' }).click();
    await expect(page).toHaveURL(/\/novedades$/);
  });

  // Con el texto superpuesto a la foto (desde 768 px), axe no puede calcular el contraste. Se oculta el texto,
  // se muestrea el fondo real tras él y se compara el peor píxel con el color del texto (AA: 4,5:1).
  for (const width of [768, 900, 1024, 1280]) {
    test(`el texto sobre la foto cumple AA (4,5:1) a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await currentImage(page);
      for (const selector of ['[data-testid="hero-text"] h1', '[data-testid="hero-text"] p']) {
        const target = page.locator(selector);
        const textColor = await target.evaluate((el) => getComputedStyle(el).color);
        const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
        expect(match, `color de ${selector}`).not.toBeNull();
        const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
        await target.evaluate((el) => {
          el.setAttribute('style', 'color: transparent !important');
        });
        const box = await target.boundingBox();
        expect(box, `caja de ${selector}`).not.toBeNull();
        const png = await page.screenshot({ clip: { x: box?.x ?? 0, y: box?.y ?? 0, width: box?.width ?? 1, height: box?.height ?? 1 } });
        const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        let worst = Infinity;
        for (let i = 0; i < data.length; i += info.channels) {
          worst = Math.min(worst, contrast(textL, luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)));
        }
        await target.evaluate((el) => {
          el.removeAttribute('style');
        });
        expect(worst, `contraste mínimo de ${selector} a ${width}px`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
