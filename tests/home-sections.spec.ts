import { expect, test, type Page } from '@playwright/test';

// CA-83, CA-84 y CA-85 (T-048): secciones de la portada. Dependen del seed del catálogo de ejemplo: hay cuatro
// productos marcados como novedad (`catalog-demo.sql`).

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('Explora (CA-83)', () => {
  test('hay cuatro accesos con imagen, enlace válido, nombre accesible y zona táctil de al menos 44 px', async ({ page }) => {
    await open(page);
    const section = page.getByRole('region', { name: 'Explora' });
    await expect(section.getByRole('heading', { level: 2, name: 'Explora' })).toBeVisible();
    const tiles = section.getByTestId('explore-tile');
    await expect(tiles).toHaveCount(4);

    const expected = [
      ['Mujer', '/mujer'],
      ['Hombre', '/hombre'],
      ['Novedades', '/novedades'],
      ['Ofertas', '/ofertas'],
    ] as const;
    for (const [label, href] of expected) {
      const link = section.getByRole('link', { name: label, exact: true });
      await expect(link).toHaveAttribute('href', href);
      const box = await link.boundingBox();
      expect(box?.width ?? 0, `ancho de ${label}`).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0, `alto de ${label}`).toBeGreaterThanOrEqual(44);
      const img = link.locator('img');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('alt', '');
      await img.scrollIntoViewIfNeeded();
      const loaded = await img.evaluate(async (el) => {
        if (!(el instanceof HTMLImageElement)) return false;
        await el.decode().catch(() => undefined);
        return el.naturalWidth > 0;
      });
      expect(loaded, `imagen de ${label}`).toBe(true);
    }
  });

  test('los accesos llevan a páginas que existen', async ({ page }) => {
    await open(page);
    for (const [label, url] of [
      ['Mujer', /\/mujer$/],
      ['Hombre', /\/hombre$/],
      ['Novedades', /\/novedades$/],
      ['Ofertas', /\/ofertas$/],
    ] as const) {
      await open(page);
      await page.getByRole('region', { name: 'Explora' }).getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('rejilla de 2 columnas en móvil y de 4 en escritorio, sin scroll horizontal', async ({ page }) => {
    for (const [width, columns] of [
      [375, 2],
      [1280, 4],
    ] as const) {
      await open(page, width);
      const lefts = await page
        .getByTestId('explore-tile')
        .evaluateAll((tiles) => [...new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().left)))]);
      expect(lefts, `columnas a ${width}px`).toHaveLength(columns);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('banner de envío gratis (CA-84)', () => {
  test('dice que el envío es gratis por encima del umbral real, centrado', async ({ page }) => {
    await open(page);
    const banner = page.getByTestId('shipping-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Envío gratis en pedidos superiores a 50,00 €');
    await expect(banner).not.toContainText('49,99');
    expect(await banner.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
    const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('novedades (CA-85)', () => {
  test('muestra hasta 8 novedades con la tarjeta del catálogo y un enlace «Ver todo» a /novedades', async ({ page }) => {
    await open(page);
    const section = page.getByTestId('new-arrivals');
    await expect(section.getByRole('heading', { level: 2, name: 'Novedades' })).toBeVisible();
    const cards = section.locator('article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(8);
    // Todas son novedad: llevan la insignia «Nuevo».
    await expect(section.getByText('Nuevo', { exact: true })).toHaveCount(count);
    await expect(section.getByRole('link', { name: 'Ver todo' })).toHaveAttribute('href', '/novedades');
  });

  test('son las mismas que las de la página /novedades (hasta 8)', async ({ page }) => {
    await open(page);
    const home = (await page.getByTestId('new-arrivals').locator('article h2').allInnerTexts()).sort();
    await page.goto('/novedades');
    await expect(page.getByRole('status')).toHaveCount(0);
    const all = (await page.locator('article h2').allInnerTexts()).sort();
    expect(all.length).toBeGreaterThanOrEqual(home.length);
    for (const name of home) expect(all).toContain(name);
  });

  test('cada tarjeta lleva a su ficha', async ({ page }) => {
    await open(page);
    const first = page.getByTestId('new-arrivals').locator('article').first();
    const name = await first.locator('h2').innerText();
    await first.getByRole('link', { name }).click();
    await expect(page).toHaveURL(/\/producto\//);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });
});

test.describe('portada completa', () => {
  test('sin scroll horizontal ni elementos cortados de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await open(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('sigue mostrando el bloque de envío y devolución', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Envío y devolución' })).toBeVisible();
  });
});
