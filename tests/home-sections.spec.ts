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

test.describe('franja de envío gratis (CA-117)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('dice que el envío es gratis desde el umbral real, centrado y sin foto', async ({ page }) => {
    await open(page);
    const banner = page.getByTestId('shipping-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Envío gratis a partir de 50,00 €');
    await expect(banner).not.toContainText('49,99');
    await expect(banner.locator('img')).toHaveCount(0);
    // CA-143 y CA-145: icono de camión decorativo, título en mayúsculas y subtítulo que no repite a la sección de confianza.
    await expect(banner.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(page.getByTestId('shipping-banner-text')).toHaveCSS('text-transform', 'uppercase');
    await expect(page.getByTestId('shipping-banner-detail')).toHaveText('Se aplica automáticamente al tramitar tu compra.');
    const text = page.getByTestId('shipping-banner-text');
    const bannerBox = await banner.boundingBox();
    const textBox = await text.boundingBox();
    const centre = (textBox?.x ?? 0) + (textBox?.width ?? 0) / 2;
    expect(Math.abs(centre - ((bannerBox?.x ?? 0) + (bannerBox?.width ?? 0) / 2))).toBeLessThan(2);
  });

  for (const width of [320, 375, 768, 1280, 1920]) {
    test(`es una franja a todo el ancho y cabe sin scroll horizontal a ${width} px`, async ({ page }) => {
      await open(page, width);
      const banner = page.getByTestId('shipping-banner');
      await banner.scrollIntoViewIfNeeded();
      const box = await banner.boundingBox();
      expect(box?.width ?? 0).toBeCloseTo(width - (await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)), 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const width of [320, 375, 768, 1280]) {
    test(`el texto cumple AA (4,5:1) sobre el fondo a ${width} px`, async ({ page }) => {
      await open(page, width);
      const banner = page.getByTestId('shipping-banner');
      const target = page.getByTestId('shipping-banner-text');
      await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const textColor = await target.evaluate((el) => getComputedStyle(el).color);
      const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
      expect(match).not.toBeNull();
      const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
      // Se oculta todo el contenido (título, subtítulo e icono) para medir solo el fondo.
      await banner.evaluate((el) => el.querySelectorAll('p, svg').forEach((child) => child.setAttribute('style', 'visibility: hidden !important')));
      const png = await banner.screenshot();
      await banner.evaluate((el) => el.querySelectorAll('p, svg').forEach((child) => child.removeAttribute('style')));
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let worst = Infinity;
      for (let i = 0; i < data.length; i += info.channels) {
        worst = Math.min(worst, contrast(textL, luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)));
      }
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

// CA-146 (T-113): Novedades como carrusel con efecto peek.
test.describe('carrusel de novedades (CA-146)', () => {
  for (const [width, expected] of [
    [1280, 4],
    [768, 2.5],
    [375, 1.2],
  ] as const) {
    test(`a ${width} px se ven ≈ ${expected} tarjetas y la separación es de 24 px`, async ({ page }) => {
      await open(page, width);
      const viewport = page.getByTestId('novedades-viewport');
      await viewport.scrollIntoViewIfNeeded();
      const slides = page.getByTestId('novedades-slide');
      const box = await viewport.boundingBox();
      const first = await slides.nth(0).boundingBox();
      const card1 = await slides.nth(0).locator('article').boundingBox();
      const card2 = await slides.nth(1).locator('article').boundingBox();
      if (!box || !first || !card1 || !card2) throw new Error('sin medidas');
      // Cada slide mide (visor + 24 px) / n; la tarjeta, 24 px menos que su slide (pl-6).
      expect((box.width + 24) / first.width).toBeCloseTo(expected, 1);
      expect(card2.x - card1.x - card1.width).toBeCloseTo(24, 0);
      await expect(page.getByTestId('novedades-viewport')).toHaveCSS('overflow-x', 'hidden');
    });
  }

  test('las flechas aparecen al pasar el ratón, desplazan el carrusel y se desactivan en los extremos', async ({ page }) => {
    await open(page, 1280);
    const section = page.getByTestId('new-arrivals');
    const prev = section.getByTestId('novedades-prev');
    const next = section.getByTestId('novedades-next');
    await expect(prev).toBeDisabled();
    await section.hover();
    await expect(next).toHaveCSS('opacity', '1');
    const slides = section.getByTestId('novedades-slide');
    const x0 = (await slides.nth(0).boundingBox())?.x ?? 0;
    const total = await slides.count();
    if (total <= 4) {
      await expect(next).toBeDisabled();
      return;
    }
    await next.click();
    await expect.poll(async () => (await slides.nth(0).boundingBox())?.x ?? x0).toBeLessThan(x0);
    await expect(prev).toBeEnabled();
  });

  test('una tarjeta que sale al desplazar con la flecha sigue llevando a su ficha', async ({ page }) => {
    await open(page, 1280);
    const section = page.getByTestId('new-arrivals');
    const next = section.getByTestId('novedades-next');
    await section.scrollIntoViewIfNeeded();
    await section.hover();
    if (await next.isDisabled()) return;
    // Hasta el final: la última tarjeta queda dentro de la ventana del carrusel.
    while (await next.isEnabled()) {
      await next.click();
      await page.waitForTimeout(700);
    }
    const last = section.getByTestId('novedades-slide').last().locator('article');
    // Dentro de la ventana del carrusel (en horizontal); el scroll vertical lo resuelve el clic.
    await expect
      .poll(async () => {
        const box = await last.boundingBox();
        const view = await section.getByTestId('novedades-viewport').boundingBox();
        if (!box || !view) return false;
        return box.x >= view.x - 1 && box.x + box.width <= view.x + view.width + 1;
      })
      .toBe(true);
    const name = await last.locator('h2').innerText();
    await last.getByRole('link', { name }).click();
    await expect(page).toHaveURL(/\/producto\//);
  });

  test('el carrusel no provoca scroll horizontal de la página de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 480, 600, 768, 1024, 1280]) {
      await open(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
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
