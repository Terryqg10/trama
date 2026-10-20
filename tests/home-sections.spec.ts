import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

// Contraste WCAG (luminancia relativa) para comprobar con píxeles el texto sobre fotos.
const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

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

test.describe('banner de envío gratis (CA-84, CA-98)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('dice que el envío es gratis desde el umbral real, centrado y con foto de fondo', async ({ page }) => {
    await open(page);
    const banner = page.getByTestId('shipping-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Envío gratis a partir de 50,00 €');
    await expect(banner).not.toContainText('49,99');
    const text = page.getByTestId('shipping-banner-text');
    const bannerBox = await banner.boundingBox();
    const textBox = await text.boundingBox();
    const centre = (textBox?.x ?? 0) + (textBox?.width ?? 0) / 2;
    expect(Math.abs(centre - ((bannerBox?.x ?? 0) + (bannerBox?.width ?? 0) / 2))).toBeLessThan(2);
    const img = banner.locator('img');
    await img.scrollIntoViewIfNeeded();
    const loaded = await img.evaluate(async (el) => {
      if (!(el instanceof HTMLImageElement)) return false;
      await el.decode().catch(() => undefined);
      return el.naturalWidth > 0 && el.currentSrc.includes('banner-envio-gratis');
    });
    expect(loaded).toBe(true);
  });

  for (const [width, height] of [
    [320, 224],
    [375, 224],
    [767, 224],
    [768, 320],
    [1280, 320],
  ] as const) {
    test(`mide ${height} px de alto y cabe sin scroll horizontal a ${width} px`, async ({ page }) => {
      await open(page, width);
      const banner = page.getByTestId('shipping-banner');
      await banner.scrollIntoViewIfNeeded();
      expect((await banner.boundingBox())?.height ?? 0).toBeCloseTo(height, 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const width of [320, 375, 768, 1280]) {
    test(`el texto sobre la foto cumple AA (4,5:1) a ${width} px`, async ({ page }) => {
      await open(page, width);
      const target = page.getByTestId('shipping-banner-text');
      await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.getByTestId('shipping-banner').locator('img').evaluate((el) => (el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : undefined));
      const textColor = await target.evaluate((el) => getComputedStyle(el).color);
      const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
      expect(match).not.toBeNull();
      const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
      await target.evaluate((el) => el.setAttribute('style', 'color: transparent !important'));
      // Captura del propio banner (no de la página): en el WebKit móvil, con DPR 3, un recorte de página sale en blanco.
      const rect = await target.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        const banner = el.closest('[data-testid="shipping-banner"]')?.getBoundingClientRect();
        return { x: r.x - (banner?.x ?? 0), y: r.y - (banner?.y ?? 0), width: r.width, height: r.height, bannerWidth: banner?.width ?? 1 };
      });
      const shot = await page.getByTestId('shipping-banner').screenshot();
      const scale = (await sharp(shot).metadata()).width! / rect.bannerWidth;
      const png = await sharp(shot)
        .extract({
          left: Math.round(rect.x * scale),
          top: Math.round(rect.y * scale),
          width: Math.max(1, Math.round(rect.width * scale)),
          height: Math.max(1, Math.round(rect.height * scale)),
        })
        .png()
        .toBuffer();
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let worst = Infinity;
      for (let i = 0; i < data.length; i += info.channels) {
        worst = Math.min(worst, contrast(textL, luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)));
      }
      await target.evaluate((el) => el.removeAttribute('style'));
      expect(worst, `contraste mínimo a ${width}px`).toBeGreaterThanOrEqual(4.5);
    });
  }
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

  test('sigue mostrando las condiciones de envío y devolución (sección de confianza)', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Compra con tranquilidad' })).toBeVisible();
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
    await expect(sections).toHaveCount(5);
    const banner = sections.nth(3);
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
    const banner = page.locator('[data-reveal]').nth(3);
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
      const wrapper = page.locator('[data-reveal]').nth(3);
      await expect(wrapper).toHaveCSS('opacity', '1');
      expect(transformIsNone(await wrapper.evaluate((el) => getComputedStyle(el).transform))).toBe(true);
      await expect(page.getByTestId('shipping-banner')).toBeVisible();
    });
  });
});

// CA-116 (T-071): sección «Prepárate para el frío» con carrusel de cuatro tarjetas de categoría.

const COLD_TILES = [
  ['Abrigos', '/mujer?categoria=abrigos'],
  ['Jerséis', '/mujer?categoria=jerseis'],
  ['Chaquetas', '/hombre?categoria=chaquetas'],
  ['Sudaderas', '/hombre?categoria=sudaderas'],
] as const;

test.describe('Prepárate para el frío (CA-116)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('está bajo el banner dividido, con título y cuatro tarjetas con enlace válido, foto y zona táctil ≥ 44 px', async ({ page }) => {
    await open(page);
    const section = page.getByTestId('cold-section');
    await expect(section.getByRole('heading', { level: 2, name: 'Prepárate para el frío' })).toBeVisible();
    const dual = await page.getByTestId('dual-banner').boundingBox();
    const box = await section.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan((dual?.y ?? 0) + (dual?.height ?? 0) - 1);
    const tiles = section.getByTestId('cold-tile');
    await expect(tiles).toHaveCount(4);
    for (const [index, [label, href]] of COLD_TILES.entries()) {
      const tile = tiles.nth(index);
      await expect(tile).toHaveAttribute('href', href);
      await expect(tile).toContainText(label);
      await tile.scrollIntoViewIfNeeded();
      const img = tile.locator('img');
      await img.evaluate((el) => (el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : undefined));
      expect(await img.evaluate((el) => (el instanceof HTMLImageElement ? el.naturalWidth : 0))).toBeGreaterThan(0);
      const size = await tile.boundingBox();
      expect(size?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('cada tarjeta lleva a un listado con productos', async ({ page }) => {
    for (const [, href] of COLD_TILES) {
      await open(page);
      await page.getByTestId('cold-section').locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(href.replace('?', '\\?')));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.locator('main a[href^="/producto/"]').count(), href).toBeGreaterThan(0);
    }
  });

  test('desde 768 px son 4 columnas en el contenedor y en móvil se desliza con imán', async ({ page }) => {
    await open(page, 1280);
    const wide = await page.getByTestId('cold-section').boundingBox();
    expect(wide?.width ?? 0).toBeLessThanOrEqual(1152);
    const tops = await page.getByTestId('cold-tile').evaluateAll((items) => items.map((i) => Math.round(i.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    await open(page, 375);
    const list = page.getByTestId('cold-list');
    await list.scrollIntoViewIfNeeded();
    const styles = await list.evaluate((el) => ({ snap: getComputedStyle(el).scrollSnapType, scrollable: el.scrollWidth > el.clientWidth }));
    expect(styles.snap).toContain('x');
    expect(styles.scrollable).toBe(true);
    // La siguiente tarjeta asoma: la segunda empieza dentro de la ventana.
    const second = await page.getByTestId('cold-tile').nth(1).boundingBox();
    expect(second?.x ?? 0).toBeLessThan(375);
  });

  test('el foco es visible y no hay autoavance ni scroll horizontal de página', async ({ page }) => {
    for (const width of [320, 375, 768, 1280, 1920]) {
      await open(page, width);
      const tile = page.getByTestId('cold-tile').first();
      await tile.scrollIntoViewIfNeeded();
      await tile.focus();
      expect(await tile.evaluate((el) => getComputedStyle(el).outlineStyle), `foco a ${width}px`).not.toBe('none');
      const before = await page.getByTestId('cold-list').evaluate((el) => el.scrollLeft);
      await page.waitForTimeout(600);
      expect(await page.getByTestId('cold-list').evaluate((el) => el.scrollLeft)).toBe(before);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('la etiqueta de cada tarjeta cumple AA (4,5:1) sobre la foto', async ({ page }) => {
    await open(page, 1280);
    for (const [index, [label]] of COLD_TILES.entries()) {
      const tile = page.getByTestId('cold-tile').nth(index);
      await tile.scrollIntoViewIfNeeded();
      await tile.locator('img').evaluate((el) => (el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : undefined));
      const target = tile.locator('span', { hasText: label });
      const textColor = await target.evaluate((el) => getComputedStyle(el).color);
      const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
      expect(match).not.toBeNull();
      const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
      await target.evaluate((el) => el.setAttribute('style', 'color: transparent !important'));
      const rect = await target.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const png = await page.screenshot({ clip: rect });
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let worst = Infinity;
      for (let i = 0; i < data.length; i += info.channels) {
        worst = Math.min(worst, contrast(textL, luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)));
      }
      await target.evaluate((el) => el.removeAttribute('style'));
      expect(worst, `contraste de «${label}»`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
