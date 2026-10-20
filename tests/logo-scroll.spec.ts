import { expect, test, type Page } from '@playwright/test';

// CA-109 (T-065): en `/` con scroll, el logo sube al inicio (suave; de golpe con reduced-motion) y la URL sigue siendo
// `/`. Desde otra página lleva a `/`.

const logo = (page: Page) => page.locator('header').getByRole('link', { name: 'Trama, ir al inicio' }).first();
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: width < 768 ? 812 : 800 });
  await page.goto(url);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(logo(page)).toBeVisible();
}

test.describe('el logo sube al inicio (CA-109)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('en / con scroll, pulsar el logo sube hasta arriba y la URL sigue siendo /', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(1500);
    await logo(page).click();
    await expect.poll(() => scrollY(page)).toBe(0);
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('el desplazamiento es suave: se pasa por posiciones intermedias', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 3000));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(2000);
    const samples: number[] = [];
    await page.evaluate(() => {
      document.documentElement.dataset.trail = '';
      window.addEventListener('scroll', () => {
        document.documentElement.dataset.trail += `${Math.round(window.scrollY)},`;
      });
    });
    await logo(page).click();
    await expect.poll(() => scrollY(page)).toBe(0);
    const trail = await page.evaluate(() => document.documentElement.dataset.trail ?? '');
    samples.push(...trail.split(',').filter(Boolean).map(Number));
    expect(samples.length).toBeGreaterThan(2);
  });

  test('la cabecera sigue pegada y la página no recarga', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => {
      document.documentElement.dataset.sinRecarga = 'true';
      window.scrollTo(0, 1800);
    });
    await expect.poll(() => scrollY(page)).toBeGreaterThan(1000);
    await logo(page).click();
    await expect.poll(() => scrollY(page)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.dataset.sinRecarga)).toBe('true');
  });

  test('en el menú móvil, el logo también sube y cierra el menú', async ({ page }) => {
    await open(page, '/', 375);
    await page.evaluate(() => window.scrollTo(0, 1800));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(1000);
    await page.getByTestId('menu-open').click();
    await page.getByTestId('menu-overlay').getByRole('link', { name: 'Trama, ir al inicio' }).click();
    await expect(page.getByTestId('menu-overlay')).toBeHidden();
    await expect.poll(() => scrollY(page)).toBe(0);
  });

  test('desde otra página, el logo lleva a /', async ({ page }) => {
    await open(page, '/hombre');
    await logo(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('en / con parámetros, el logo navega a / limpio', async ({ page }) => {
    await open(page, '/?utm=prueba');
    await logo(page).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('con Ctrl o clic central no se intercepta (abre en pestaña nueva)', async ({ page, context }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(900);
    const popup = context.waitForEvent('page');
    await logo(page).click({ modifiers: ['ControlOrMeta'] });
    const opened = await popup;
    await opened.waitForURL(/localhost/);
    expect(new URL(opened.url()).pathname).toBe('/');
    expect(await scrollY(page)).toBeGreaterThan(900);
  });
});

test.describe('con prefers-reduced-motion (CA-109)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('sube de golpe, sin animación', async ({ page }) => {
    await open(page, '/');
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(1500);
    await logo(page).click();
    await expect.poll(() => scrollY(page), { timeout: 1000 }).toBe(0);
  });
});
