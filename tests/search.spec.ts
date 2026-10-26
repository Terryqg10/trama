import { expect, test, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-91, CA-148 y CA-93 (T-052, Enmiendas 27 y 48): buscador de la cabecera (campo en escritorio y fila propia en móvil)
// y página /buscar. Las sugerencias están en `search-typeahead.spec.ts`.

const desktopField = (page: Page) => page.locator('header').getByRole('combobox', { name: 'Buscar productos' }).first();
const row = (page: Page) => page.getByTestId('search-row');
const rowField = (page: Page) => row(page).getByRole('combobox', { name: 'Buscar productos' });

async function open(page: Page, width: number, url = '/', withScript = true): Promise<void> {
  await page.setViewportSize({ width, height: width < 768 ? 812 : 800 });
  await page.goto(url);
  await expect(page.getByRole('main')).toBeVisible();
  // Con JavaScript, esperar a que React controle el campo (si no, lo escrito se pierde al hidratar).
  if (withScript) await expect(page.locator('header input[data-ready="true"]').first()).toBeAttached();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('buscador en escritorio (CA-91)', () => {
  test('a 1280 px hay un campo de búsqueda centrado, con placeholder, lupa y estilo de tokens', async ({ page }) => {
    await open(page, 1280);
    const field = desktopField(page);
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute('type', 'search');
    await expect(field).toHaveAttribute('placeholder', 'Buscar productos...');
    await expect(row(page)).toBeHidden();
    const style = await field.evaluate((el) => {
      const css = getComputedStyle(el);
      return { radius: css.borderTopLeftRadius, background: css.backgroundColor };
    });
    expect(parseFloat(style.radius)).toBeGreaterThan(0);
    const mutedBg = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'bg-surface-muted';
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    expect(style.background).toBe(mutedBg);
    // La lupa está dentro del campo (icono SVG decorativo) y el campo mide al menos 44 px de alto.
    await expect(field.locator('xpath=..').locator('svg')).toHaveCount(1);
    expect((await field.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    // Está entre el menú y las acciones, hacia el centro de la cabecera.
    const box = await field.boundingBox();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - 640)).toBeLessThan(200);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('escribir y pulsar Intro lleva a /buscar?q= con los resultados, sin recargar el documento', async ({ page }) => {
    await open(page, 1280);
    await markDocument(page);
    await desktopField(page).fill('camiseta');
    await desktopField(page).press('Enter');
    await expect(page).toHaveURL(/\/buscar\?q=camiseta$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resultados para «camiseta»' })).toBeVisible();
    await expectNoReload(page);
  });

  for (const width of [768, 1023, 1024, 1280]) {
    test(`a ${width} px no hay scroll horizontal ni cortes en la cabecera`, async ({ page }) => {
      await open(page, width);
      expect(await overflow(page)).toBeLessThanOrEqual(1);
      // A partir de 1024 px el campo está en la cabecera; por debajo, en su fila propia.
      if (width >= 1024) await expect(desktopField(page)).toBeVisible();
      else await expect(rowField(page)).toBeVisible();
    });
  }
});

test.describe('buscador en móvil (CA-148)', () => {
  test('el campo está solo en una fila bajo la cabecera, a todo el ancho, con botón «Buscar» de 44 px y sin lupa en la cabecera', async ({ page }) => {
    for (const width of [320, 375, 767]) {
      await open(page, width);
      await expect(desktopField(page)).toBeHidden();
      await expect(rowField(page)).toBeVisible();
      const header = await page.locator('header').boundingBox();
      const field = await rowField(page).boundingBox();
      const button = await row(page).getByRole('button', { name: 'Buscar' }).boundingBox();
      if (!header || !field || !button) throw new Error('sin medidas');
      expect(field.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(button.x + button.width, `a ${width}px`).toBeLessThanOrEqual(width);
      expect(field.width).toBeGreaterThan(width - 120);
      expect(await overflow(page), `scroll a ${width}px`).toBeLessThanOrEqual(1);
    }
    await expect(page.getByRole('link', { name: 'Abrir buscador' })).toHaveCount(0);
  });

  test('buscar desde la fila lleva a los resultados', async ({ page }) => {
    await open(page, 375);
    await rowField(page).fill('camiseta');
    await row(page).getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/buscar\?q=camiseta$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resultados para «camiseta»' })).toBeVisible();
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('el formulario GET de la fila busca', async ({ page }) => {
      await open(page, 375, '/', false);
      await rowField(page).fill('camiseta');
      await row(page).getByRole('button', { name: 'Buscar' }).click();
      await expect(page).toHaveURL(/\/buscar\?q=camiseta$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Resultados para «camiseta»' })).toBeVisible();
    });
  });
});

test.describe('página de resultados (CA-93)', () => {
  test('lista los productos cuyo nombre contiene el texto, sin distinguir mayúsculas', async ({ page }) => {
    await open(page, 1280, '/buscar?q=camiseta');
    const names = await page.locator('article h2').allInnerTexts();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.toLowerCase()).toContain('camiseta');
    await expect(page.getByText(new RegExp(`^${names.length} productos?$`))).toBeVisible();

    await page.goto('/buscar?q=CAMISETA');
    expect(await page.locator('article h2').allInnerTexts()).toEqual(names);
  });

  test('cada resultado lleva a su ficha', async ({ page }) => {
    await open(page, 1280, '/buscar?q=camiseta');
    const first = page.locator('article').first();
    const name = await first.locator('h2').innerText();
    await first.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(/\/producto\//);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });

  test('sin coincidencias, muestra un estado vacío con enlace al catálogo', async ({ page }) => {
    await open(page, 1280, '/buscar?q=zzzzzz');
    await expect(page.getByText('No hay productos para «zzzzzz»')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ver novedades' })).toHaveAttribute('href', '/novedades');
  });

  test('sin texto, pide que se escriba algo', async ({ page }) => {
    for (const url of ['/buscar', '/buscar?q=', '/buscar?q=%20%20']) {
      await open(page, 1280, url);
      await expect(page.getByRole('heading', { level: 1, name: 'Buscar' })).toBeVisible();
      await expect(page.getByText('Escribe lo que buscas')).toBeVisible();
    }
  });

  test('los comodines del usuario son texto: «_» y «%» no devuelven todo el catálogo', async ({ page }) => {
    for (const q of ['_', '%25', '*']) {
      await open(page, 1280, `/buscar?q=${q}`);
      await expect(page.locator('article')).toHaveCount(0);
    }
  });

  test('un texto con HTML se limpia y nunca se pinta como HTML', async ({ page }) => {
    await open(page, 1280, '/buscar?q=%3Cb%3Ex%3C%2Fb%3E');
    // La lista blanca quita los signos < > /: queda «b x b» como texto.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resultados para «b x b»');
    await expect(page.locator('h1 b')).toHaveCount(0);
  });

  test('a 375 px la rejilla no desborda', async ({ page }) => {
    await open(page, 375, '/buscar?q=camiseta');
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
