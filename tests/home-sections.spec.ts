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

  test('a menos de 768 px es un carrusel deslizable con imán, sin scroll horizontal de la página (CA-89)', async ({ page }) => {
    for (const width of [320, 375, 767]) {
      await open(page, width);
      const list = page.getByTestId('explore-list');
      const info = await list.evaluate((el) => {
        const style = getComputedStyle(el);
        const tops = [...el.querySelectorAll('[data-testid="explore-tile"]')].map((t) => Math.round(t.getBoundingClientRect().top));
        return {
          overflowX: style.overflowX,
          snap: style.scrollSnapType,
          scrolls: el.scrollWidth > el.clientWidth + 1,
          rows: new Set(tops).size,
        };
      });
      expect(info.overflowX, `overflow-x a ${width}px`).toBe('auto');
      expect(info.snap, `scroll-snap a ${width}px`).toContain('x');
      expect(info.scrolls, `el carrusel se desliza a ${width}px`).toBe(true);
      expect(info.rows, `una sola fila a ${width}px`).toBe(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll de la página a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('en móvil se llega al último acceso deslizando y sigue siendo un enlace válido (CA-89)', async ({ page }) => {
    await open(page, 375);
    const last = page.getByTestId('explore-tile').last();
    await expect(last).not.toBeInViewport();
    await page.getByTestId('explore-list').evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' });
    });
    await expect(last).toBeInViewport();
    await expect(last).toHaveAttribute('href', '/ofertas');
  });

  test('desde 768 px es una rejilla de 4 columnas, sin scroll horizontal (CA-89)', async ({ page }) => {
    for (const width of [768, 1024, 1280]) {
      await open(page, width);
      const lefts = await page
        .getByTestId('explore-tile')
        .evaluateAll((tiles) => [...new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().left)))]);
      expect(lefts, `columnas a ${width}px`).toHaveLength(4);
      const scrolls = await page.getByTestId('explore-list').evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(scrolls, `sin carrusel a ${width}px`).toBe(false);
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

// CA-90 (T-051): Explora, banner y Novedades entran con un fundido y una subida de 20 px.
test.describe('entrada animada de las secciones (CA-90)', () => {
  const transformIsNone = (value: string): boolean => value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';

  test('parten ocultas y 20 px más abajo, y aparecen al entrar en el viewport', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const sections = page.locator('[data-reveal]');
    await expect(sections).toHaveCount(3);
    const banner = sections.nth(1);
    // Está por debajo del primer pantallazo: aún no ha entrado.
    await expect(banner).toHaveCSS('opacity', '0');
    expect(await banner.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, 20)');
    await banner.scrollIntoViewIfNeeded();
    await expect(banner).toHaveCSS('opacity', '1');
    await expect.poll(async () => transformIsNone(await banner.evaluate((el) => getComputedStyle(el).transform))).toBe(true);
    await expect(page.getByTestId('shipping-banner')).toBeInViewport();
  });

  test('una vez mostrada, no se vuelve a ocultar al salir del viewport', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const banner = page.locator('[data-reveal]').nth(1);
    await banner.scrollIntoViewIfNeeded();
    await expect(banner).toHaveCSS('opacity', '1');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(banner).toHaveCSS('opacity', '1');
  });

  test('con prefers-reduced-motion no hay nada animado y todo se ve desde el principio', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('shipping-banner')).toBeVisible();
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    for (const testId of ['shipping-banner', 'new-arrivals']) {
      const style = await page.getByTestId(testId).evaluate((el) => {
        const wrapper = el.parentElement;
        return wrapper ? { opacity: getComputedStyle(wrapper).opacity, transform: getComputedStyle(wrapper).transform } : null;
      });
      expect(style?.opacity, `opacidad de ${testId}`).toBe('1');
      expect(transformIsNone(style?.transform ?? ''), `transform de ${testId}`).toBe(true);
    }
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('las secciones se ven igualmente', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/');
      const wrapper = page.locator('[data-reveal]').nth(1);
      await expect(wrapper).toHaveCSS('opacity', '1');
      expect(transformIsNone(await wrapper.evaluate((el) => getComputedStyle(el).transform))).toBe(true);
      await expect(page.getByTestId('shipping-banner')).toBeVisible();
    });
  });
});
