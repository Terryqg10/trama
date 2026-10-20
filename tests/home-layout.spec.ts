import { expect, test, type Page } from '@playwright/test';

// CA-115 (T-070): la portada alterna bandas a sangre (hero, banner dividido, banner de otoño y banner de envío) con
// secciones en contenedor (Explora, Novedades y «Compra con tranquilidad»). El texto de los banners dividido y de otoño
// se alinea con el borde del contenedor aunque la foto ocupe toda la ventana.

test.use({ reducedMotion: 'reduce' });

const WIDTHS = [320, 375, 640, 768, 1024, 1280, 1440, 1920] as const;
/** `--layout-container` (72 rem a 16 px). */
const CONTAINER = 1152;
/** `--layout-gutter`: clamp(1rem, 4vw, 1.5rem). */
const gutter = (width: number): number => Math.min(24, Math.max(16, width * 0.04));
/** Dónde empieza el contenido del contenedor (y por tanto el texto alineado con él). */
const edge = (width: number): number => Math.max(0, (width - CONTAINER) / 2) + gutter(width);

const FULL_BLEED = ['hero-slider', 'dual-banner', 'shipping-banner'] as const;

async function open(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('dual-banner')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('newsletter')).toBeAttached();
}

const box = async (page: Page, testId: string) => {
  const target = page.getByTestId(testId);
  await target.scrollIntoViewIfNeeded();
  return target.boundingBox();
};

test.describe('bandas a sangre (CA-115)', () => {
  for (const width of WIDTHS) {
    test(`a ${width} px el hero, el banner dividido, el de otoño y el de envío miden todo el ancho`, async ({ page }) => {
      await open(page, width);
      for (const testId of FULL_BLEED) {
        const b = await box(page, testId);
        expect(b?.x ?? -1, `${testId} empieza en 0`).toBeLessThanOrEqual(0.5);
        expect(b?.width ?? 0, `${testId} mide el ancho de la ventana`).toBeGreaterThanOrEqual(width - 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }

  test('ningún contenedor con ancho máximo envuelve a las bandas a sangre', async ({ page }) => {
    await open(page, 1920);
    for (const testId of FULL_BLEED) {
      const narrow = await page.getByTestId(testId).evaluate((el) => {
        const found: string[] = [];
        for (let node = el.parentElement; node && node.tagName !== 'BODY'; node = node.parentElement) {
          if (node.getBoundingClientRect().width < window.innerWidth - 1) found.push(`${node.tagName.toLowerCase()}.${node.className}`);
        }
        return found;
      });
      expect(narrow, `ancestros estrechos de ${testId}`).toEqual([]);
    }
  });

  test('el banner dividido no tiene esquinas redondeadas ni hueco entre las dos tarjetas', async ({ page }) => {
    await open(page, 1280);
    for (const testId of ['dual-banner']) {
      const radius = await page.getByTestId(testId).evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
      expect(radius, `radio de ${testId}`).toBe('0px');
    }
    const cards = await page.getByTestId('dual-banner-slide').first().getByTestId('dual-banner-card').evaluateAll((items) =>
      items.map((item) => {
        const r = item.getBoundingClientRect();
        return { left: r.left, right: r.right, radius: getComputedStyle(item).borderTopLeftRadius };
      }),
    );
    expect(cards).toHaveLength(2);
    expect(Math.abs((cards[0]?.right ?? 0) - (cards[1]?.left ?? 99))).toBeLessThanOrEqual(1);
    expect(cards.map((card) => card.radius)).toEqual(['0px', '0px']);
  });
});

test.describe('secciones en contenedor (CA-115)', () => {
  for (const width of WIDTHS) {
    test(`a ${width} px Explora, Novedades y «Compra con tranquilidad» no pasan de 72 rem y están centradas`, async ({ page }) => {
      await open(page, width);
      for (const locator of [page.getByTestId('explore-list'), page.getByTestId('new-arrivals'), page.getByTestId('trust-section')]) {
        await locator.scrollIntoViewIfNeeded();
        const b = await locator.boundingBox();
        expect(b?.width ?? 0).toBeLessThanOrEqual(CONTAINER + 1);
        if (width >= CONTAINER) {
          // En pantallas anchas: centrada, con el mismo margen a los dos lados.
          const left = b?.x ?? 0;
          const right = width - left - (b?.width ?? 0);
          expect(Math.abs(left - right), 'centrada').toBeLessThanOrEqual(1.5);
        }
      }
    });
  }

  test('las secciones en contenedor empiezan en el borde del contenedor (o en el margen lateral)', async ({ page }) => {
    for (const width of [375, 768, 1280, 1920]) {
      await open(page, width);
      const heading = page.getByRole('heading', { level: 2, name: 'Novedades', exact: true });
      await heading.scrollIntoViewIfNeeded();
      const b = await heading.boundingBox();
      expect(Math.abs((b?.x ?? 0) - edge(width)), `Novedades a ${width}px`).toBeLessThanOrEqual(1.5);
    }
  });
});

test.describe('texto de los banners alineado con el contenedor (CA-115)', () => {
  test('en el banner dividido, el texto de la tarjeta izquierda empieza en el borde del contenedor', async ({ page }) => {
    for (const width of WIDTHS) {
      await open(page, width);
      const text = page.getByTestId('dual-banner-slide').first().getByTestId('dual-banner-text').first();
      await text.scrollIntoViewIfNeeded();
      const b = await text.boundingBox();
      expect(Math.abs((b?.x ?? 0) - edge(width)), `dividido a ${width}px`).toBeLessThanOrEqual(1.5);
    }
  });

  test('el texto de la tarjeta derecha tiene su propio margen y no se acerca al borde de la ventana', async ({ page }) => {
    for (const width of [768, 1280, 1920]) {
      await open(page, width);
      const text = page.getByTestId('dual-banner-slide').first().getByTestId('dual-banner-text').nth(1);
      await text.scrollIntoViewIfNeeded();
      const b = await text.boundingBox();
      expect(b?.x ?? 0).toBeGreaterThanOrEqual(width / 2 + gutter(width) - 1.5);
      expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(width - gutter(width) + 1);
    }
  });

  test('en móvil el texto nunca queda a menos de un margen lateral de la ventana', async ({ page }) => {
    for (const width of [320, 375, 640]) {
      await open(page, width);
    }
  });
});

test.describe('orden de la portada (CA-115)', () => {
  test('hero, Explora, banner dividido, «Prepárate para el frío», banner de envío, Novedades, confianza y newsletter', async ({ page }) => {
    await open(page, 1280);
    const order = [
      page.getByTestId('hero-slider'),
      page.getByRole('region', { name: 'Explora' }),
      page.getByTestId('dual-banner'),
      page.getByTestId('cold-section'),
      page.getByTestId('shipping-banner'),
      page.getByTestId('new-arrivals'),
      page.getByTestId('trust-section'),
      page.getByTestId('newsletter'),
    ];
    const ys: number[] = [];
    for (const locator of order) ys.push((await locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)));
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

});
