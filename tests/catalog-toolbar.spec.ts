import { expect, test, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-12 (T-073, Enmienda 4 de SPEC-002): «Ordenar por» en la barra sobre el listado y «Ocultar filtros».

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

const sidebar = (page: Page) => page.getByTestId('filters-sidebar');
const toggle = (page: Page) => page.getByTestId('filters-toggle');
const sortSelect = (page: Page) => page.locator('select[name="orden"]');

/** Número de tarjetas de la primera fila del listado (las que comparten la misma coordenada `top`). */
async function columns(page: Page): Promise<number> {
  const tops = await page.getByTestId('product-grid').locator('> li').evaluateAll((items) =>
    items.map((item) => Math.round(item.getBoundingClientRect().top)),
  );
  return tops.filter((top) => top === tops[0]).length;
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('«Ordenar por» en la barra sobre el listado (CA-12)', () => {
  test('está a la derecha de la barra y fuera del panel de filtros', async ({ page }) => {
    await open(page, '/mujer');
    await expect(sidebar(page).locator('select[name="orden"]')).toHaveCount(0);
    await expect(sortSelect(page)).toHaveCount(1);
    const sort = await page.getByTestId('catalog-sort').boundingBox();
    const grid = await page.getByTestId('product-grid').boundingBox();
    const side = await sidebar(page).boundingBox();
    expect(sort?.x ?? 0).toBeGreaterThan((side?.x ?? 0) + (side?.width ?? 0));
    // Alineado con el borde derecho del listado y por encima de él.
    expect((sort?.x ?? 0) + (sort?.width ?? 0)).toBeCloseTo((grid?.x ?? 0) + (grid?.width ?? 0), -1);
    expect((sort?.y ?? 0) + (sort?.height ?? 0)).toBeLessThanOrEqual((grid?.y ?? 0) + 1);
  });

  test('cambiarlo reordena sin recargar y conserva los filtros en la URL', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&min=10');
    await markDocument(page);
    await sortSelect(page).selectOption('precio-desc');
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(page).toHaveURL(/min=10/);
    await expect(page).toHaveURL(/orden=precio-desc/);
    await expect
      .poll(async () => {
        const prices = await page.locator('article').evaluateAll((cards) =>
          cards.map((card) => {
            const match = /(\d+),(\d{2})\s*€/.exec(card.textContent ?? '');
            return match ? Number(match[1]) * 100 + Number(match[2]) : Number.NaN;
          }),
        );
        return prices.length > 1 && prices.every((p, i) => i === 0 || p <= (prices[i - 1] ?? 0));
      })
      .toBe(true);
    await expectNoReload(page);
    // El panel de filtros sigue con lo que tenía marcado.
    await expect(sidebar(page).getByRole('radio', { name: 'Blusas' })).toBeChecked();
  });

  test('«Limpiar» y «Atrás» devuelven el selector al orden de la URL', async ({ page }) => {
    await open(page, '/mujer');
    await sortSelect(page).selectOption('precio-asc');
    await expect(page).toHaveURL(/orden=precio-asc/);
    await page.goBack();
    await expect(sortSelect(page)).toHaveValue('novedades');
  });

  test('tiene etiqueta accesible y zona táctil de al menos 44 px', async ({ page }) => {
    await open(page, '/mujer');
    await expect(page.getByLabel('Ordenar por')).toBeVisible();
    expect((await sortSelect(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  for (const width of [320, 375, 768]) {
    test(`a ${width} px está en la barra, sin botón de ocultar y sin scroll horizontal`, async ({ page }) => {
      await open(page, '/mujer', width);
      await expect(sortSelect(page)).toBeVisible();
      await expect(toggle(page)).toBeHidden();
      expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(1);
      // El drawer no cambia: sigue abriéndose con «Filtros» y sin «Ordenar por».
      await page.getByTestId('filters-open').click();
      await expect(page.getByTestId('filters-drawer')).toBeVisible();
      await expect(page.getByTestId('filters-drawer').locator('select[name="orden"]')).toHaveCount(0);
    });
  }
});

test.describe('«Ocultar filtros» (CA-12)', () => {
  test('oculta la columna lateral, el listado pasa a 4 columnas y «Mostrar filtros» lo deshace', async ({ page }) => {
    await open(page, '/mujer');
    await expect(sidebar(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page)).toHaveAttribute('aria-controls', 'filters-sidebar');
    await expect(toggle(page)).toHaveText('Ocultar filtros');
    expect(await columns(page)).toBe(3);

    await toggle(page).click();
    await expect(sidebar(page)).toBeHidden();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toHaveText('Mostrar filtros');
    await expect(toggle(page)).toBeFocused();
    expect(await columns(page)).toBe(4);
    expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(1);

    await toggle(page).click();
    await expect(sidebar(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    expect(await columns(page)).toBe(3);
  });

  test('el botón mide al menos 44 px, tiene el icono de ajustes y se alcanza con teclado', async ({ page }) => {
    await open(page, '/mujer');
    expect((await toggle(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(toggle(page).locator('svg.lucide-sliders-horizontal')).toHaveCount(1);
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(sidebar(page)).toBeHidden();
    await page.keyboard.press('Space');
    await expect(sidebar(page)).toBeVisible();
  });

  test('ocultar los filtros no pierde los filtros aplicados ni el orden', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    await toggle(page).click();
    await toggle(page).click();
    await expect(sidebar(page).getByRole('radio', { name: 'Blusas' })).toBeChecked();
    await expect(page).toHaveURL(/categoria=blusas/);
  });

  test('no se guarda entre visitas: al recargar los filtros vuelven a estar visibles', async ({ page }) => {
    await open(page, '/mujer');
    await toggle(page).click();
    await expect(sidebar(page)).toBeHidden();
    await page.reload();
    await expect(sidebar(page)).toBeVisible();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  });

  test('a 1024 px también existe y funciona; a 1023 px no hay botón', async ({ page }) => {
    await open(page, '/mujer', 1024);
    await expect(toggle(page)).toBeVisible();
    await toggle(page).click();
    await expect(sidebar(page)).toBeHidden();
    expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(1);
    await open(page, '/mujer', 1023);
    await expect(toggle(page)).toBeHidden();
  });
});

test.describe('sin JavaScript (CA-12)', () => {
  test('el HTML del servidor lleva «Ordenar por» con su botón y ningún botón de ocultar', async ({ request }) => {
    const html = await (await request.get('/mujer?categoria=blusas')).text();
    expect(html).toContain('data-testid="catalog-sort"');
    expect(html).toMatch(/<noscript>.*?Ordenar.*?<\/noscript>/s);
    expect(html).toContain('name="categoria" value="blusas"');
    expect(html).not.toContain('data-testid="filters-toggle"');
  });

  test.describe('con JavaScript desactivado', () => {
    test.use({ javaScriptEnabled: false });

    test('el panel sigue visible, no hay botón de ocultar y «Ordenar» funciona y conserva los filtros', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/mujer?categoria=blusas');
      await expect(sidebar(page)).toBeVisible();
      await expect(toggle(page)).toHaveCount(0);
      await sortSelect(page).selectOption('precio-desc');
      await page.getByRole('button', { name: 'Ordenar', exact: true }).click();
      await expect(page).toHaveURL(/categoria=blusas/);
      await expect(page).toHaveURL(/orden=precio-desc/);
    });
  });
});
