import { expect, test, type Page } from '@playwright/test';

// CA-105 (T-062): la barra de anuncios está justo encima de la cabecera y se va con el scroll; la cabecera se queda
// pegada arriba y por encima del contenido, y ningún ancestro lo impide con un `overflow`.

const PAGES = ['/', '/hombre', '/novedades', '/mujer'] as const;

const header = (page: Page) => page.locator('body > header, header').first();

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(url);
  await expect(page.getByTestId('top-bar')).toBeVisible();
}

test.describe('cabecera fija (CA-105)', () => {
  for (const url of PAGES) {
    test(`${url}: la barra de anuncios está sobre la cabecera y la cabecera queda pegada al bajar`, async ({ page }) => {
      await open(page, url);
      const barBox = await page.getByTestId('top-bar').boundingBox();
      const headerBox = await header(page).boundingBox();
      expect(barBox?.y ?? -1).toBeLessThanOrEqual(0.5);
      expect(Math.abs((barBox?.y ?? 0) + (barBox?.height ?? 0) - (headerBox?.y ?? 0))).toBeLessThanOrEqual(1);

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
      const scrolledHeader = await header(page).boundingBox();
      expect(Math.abs(scrolledHeader?.y ?? 99)).toBeLessThanOrEqual(1);
      expect(scrolledHeader?.height ?? 0).toBeGreaterThan(40);
      // La barra de anuncios no es fija: sale de la pantalla.
      expect((await page.getByTestId('top-bar').boundingBox())?.y ?? 0).toBeLessThan(-10);
    });
  }

  test('es sticky, top 0, z-index 50 y a todo el ancho', async ({ page }) => {
    await open(page, '/');
    const style = await header(page).evaluate((el) => {
      const css = getComputedStyle(el);
      return { position: css.position, top: css.top, zIndex: css.zIndex, width: el.getBoundingClientRect().width };
    });
    expect(style).toEqual({ position: 'sticky', top: '0px', zIndex: '50', width: 1280 });
  });

  test('ningún ancestro de la cabecera tiene overflow que rompa el sticky', async ({ page }) => {
    await open(page, '/');
    const offenders = await header(page).evaluate((el) => {
      const found: string[] = [];
      for (let node = el.parentElement; node; node = node.parentElement) {
        const css = getComputedStyle(node);
        if ([css.overflowX, css.overflowY].some((value) => value !== 'visible')) {
          found.push(`${node.tagName.toLowerCase()} (${css.overflowX} / ${css.overflowY})`);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });

  test('se queda pegada también en móvil y con el menú cerrado', async ({ page }) => {
    await open(page, '/', 375);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    expect(Math.abs((await header(page).boundingBox())?.y ?? 99)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('menu-open')).toBeInViewport();
  });

  test('con la cabecera pegada, el menú móvil sigue abriéndose a pantalla completa', async ({ page }) => {
    await open(page, '/', 375);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    await page.getByTestId('menu-open').click();
    expect((await page.getByTestId('menu-overlay').boundingBox())?.height).toBe(800);
  });

  test('el contenido que pasa por debajo queda tapado por la cabecera (z-index sobre la portada)', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 400));
    const topElement = await page.evaluate(() => document.elementFromPoint(20, 30)?.closest('header') !== null);
    expect(topElement).toBe(true);
  });
});
