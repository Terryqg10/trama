import { expect, test, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-91, CA-92 y CA-93 (T-052, ajustados por la Enmienda 27): buscador de la cabecera (campo en escritorio y pantalla
// completa en móvil) y página /buscar. Las sugerencias están en `search-typeahead.spec.ts`.

const desktopField = (page: Page) => page.locator('header').getByRole('combobox', { name: 'Buscar productos' }).first();
const panel = (page: Page) => page.getByTestId('search-panel');
const trigger = (page: Page) => page.getByTestId('search-open');

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
    await expect(trigger(page)).toBeHidden();
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
      // A partir de 1024 px hay campo; por debajo, icono de lupa.
      if (width >= 1024) await expect(desktopField(page)).toBeVisible();
      else await expect(trigger(page)).toBeVisible();
    });
  }
});

test.describe('buscador en móvil (CA-92)', () => {
  test('solo se ve el icono de lupa; al pulsarlo se abre a pantalla completa con el campo enfocado', async ({ page }) => {
    await open(page, 375);
    await expect(desktopField(page)).toBeHidden();
    await expect(trigger(page)).toBeVisible();
    expect((await trigger(page).boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
    await expect(panel(page)).toBeHidden();
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveAttribute('role', 'dialog');
    await expect(panel(page).getByRole('combobox', { name: 'Buscar productos' })).toBeFocused();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    const box = await panel(page).boundingBox();
    expect([box?.x, box?.y, box?.width, box?.height]).toEqual([0, 0, 375, 812]);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('Esc y el botón de cerrar lo cierran y el foco vuelve a la lupa', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();

    await trigger(page).click();
    await panel(page).getByRole('link', { name: 'Cerrar buscador' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();

  });

  test('buscar desde el panel lleva a los resultados y lo cierra', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await panel(page).getByRole('combobox').fill('camiseta');
    await panel(page).getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/buscar\?q=camiseta$/);
    await expect(panel(page)).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Resultados para «camiseta»' })).toBeVisible();
  });

  test('el panel cabe en 320 px, 375 px y 767 px sin scroll horizontal', async ({ page }) => {
    for (const width of [320, 375, 767]) {
      await open(page, width);
      await trigger(page).click();
      await expect(panel(page)).toBeVisible();
      expect(await overflow(page), `scroll a ${width}px`).toBeLessThanOrEqual(1);
      const box = await panel(page).getByRole('combobox').boundingBox();
      expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    }
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('el enlace #buscador abre el panel con :target y el formulario GET busca', async ({ page }) => {
      await open(page, 375, '/', false);
      await trigger(page).click();
      await expect(page).toHaveURL(/#buscador$/);
      await expect(panel(page)).toBeVisible();
      await panel(page).getByRole('combobox').fill('camiseta');
      await panel(page).getByRole('button', { name: 'Buscar' }).click();
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
    await first.getByRole('link').first().click();
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
