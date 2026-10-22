import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-16 (T-080, Enmienda 7 de SPEC-002): lista de filtros activos con una X por cada uno.

const ALL = '/mujer?categoria=blusas&ocasion=vestir&talla=M&color=negro&min=25&max=70&orden=precio-asc';

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Lista de filtros activos visible: la de la columna lateral (≥ 1024 px) o la del drawer abierto. */
async function list(page: Page, width: number): Promise<Locator> {
  if (width >= 1024) return page.getByTestId('filters-sidebar').getByTestId('active-filters');
  await page.getByTestId('filters-open').click();
  await expect(page.getByTestId('filters-drawer')).toBeVisible();
  return page.getByTestId('filters-drawer').getByTestId('active-filters');
}

const params = (page: Page) => new URL(page.url()).searchParams;

test.describe('lista de filtros activos (CA-16)', () => {
  for (const width of [375, 1280]) {
    test(`a ${width} px: un chip por filtro con nombre, valor, X y nombre accesible «Quitar filtro …»`, async ({ page }) => {
      await open(page, ALL, width);
      const chips = (await list(page, width)).getByTestId('active-filter');
      await expect(chips).toHaveCount(5);
      const expected = [
        ['categoria', 'Categoría: Blusas'],
        ['ocasion', 'Ocasión: Vestir'],
        ['talla', 'Talla: M'],
        ['color', 'Color: Negro'],
        ['precio', 'Precio: 25–70 €'],
      ] as const;
      for (const [index, [key, text]] of expected.entries()) {
        const chip = chips.nth(index);
        await expect(chip).toHaveAttribute('data-filter', key);
        await expect(chip).toContainText(text);
        await expect(chip).toHaveAttribute('aria-label', `Quitar filtro ${text}`);
        await expect(chip.locator('svg.lucide-x')).toBeVisible();
        expect((await chip.boundingBox())?.height ?? 0, text).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test('sin filtros activos no hay lista', async ({ page }) => {
    await open(page, '/mujer');
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
  });

  test('con solo el orden elegido tampoco hay lista (el orden no es un filtro)', async ({ page }) => {
    await open(page, '/mujer?orden=precio-asc');
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
  });
});

test.describe('quitar un filtro (CA-16)', () => {
  test('quita solo ese filtro, conserva el resto y el orden, sin recargar; la opción queda sin marcar', async ({ page }) => {
    await open(page, ALL);
    await markDocument(page);
    const panel = page.getByTestId('filters-panel');
    const chips = page.getByTestId('filters-sidebar').getByTestId('active-filters');
    await chips.locator('[data-filter="talla"]').click();
    await expect.poll(() => params(page).has('talla')).toBe(false);
    for (const [key, value] of [
      ['categoria', 'blusas'],
      ['ocasion', 'vestir'],
      ['color', 'negro'],
      ['min', '25'],
      ['max', '70'],
      ['orden', 'precio-asc'],
    ] as const) {
      expect(params(page).get(key), key).toBe(value);
    }
    await expectNoReload(page);
    await expect(chips.getByTestId('active-filter')).toHaveCount(4);
    await expect(chips.locator('[data-filter="talla"]')).toHaveCount(0);
    await expect(panel.getByRole('radio', { name: 'M', exact: true })).not.toBeChecked();
    await expect(panel.getByRole('radio', { name: 'Blusas' })).toBeChecked();
    await expect(panel.getByRole('radio', { name: 'Negro' })).toBeChecked();
    await expect(page.getByTestId('filters-count')).toHaveText('4 activos');
  });

  test('se pueden quitar uno a uno hasta que no queda ninguno y desaparece la lista', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&color=negro');
    const chips = page.getByTestId('filters-sidebar').getByTestId('active-filters');
    await chips.locator('[data-filter="color"]').click();
    await expect(chips.getByTestId('active-filter')).toHaveCount(1);
    await chips.locator('[data-filter="categoria"]').click();
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
    await expect(page).toHaveURL(/\/mujer$/);
    await expect(page.getByTestId('filters-count')).toHaveCount(0);
  });

  test('el chip del precio quita min y max y devuelve el intervalo a sus límites', async ({ page }) => {
    await open(page, '/mujer?min=30&max=60&categoria=blusas');
    const panel = page.getByTestId('filters-panel');
    await expect(panel.getByTestId('price-range')).toBeVisible();
    const lowest = Number(await panel.getByTestId('price-thumb-min').getAttribute('min'));
    const highest = Number(await panel.getByTestId('price-thumb-min').getAttribute('max'));
    await page.getByTestId('filters-sidebar').locator('[data-filter="precio"]').click();
    await expect.poll(() => params(page).has('min') || params(page).has('max')).toBe(false);
    expect(params(page).get('categoria')).toBe('blusas');
    await expect(panel.getByTestId('price-min')).toHaveValue(String(lowest));
    await expect(panel.getByTestId('price-max')).toHaveValue(String(highest));
    await expect(panel.getByTestId('price-thumb-min')).toHaveValue(String(lowest));
    await expect(panel.getByTestId('price-thumb-max')).toHaveValue(String(highest));
  });

  test('«Limpiar» sigue quitándolos todos de golpe conservando el orden', async ({ page }) => {
    await open(page, ALL);
    await page.getByTestId('filters-panel').getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer\?orden=precio-asc$/);
    await expect(page.getByTestId('active-filters')).toHaveCount(0);
  });

  test('en Novedades el género es un chip quitable; en /mujer no (lo fija la ruta)', async ({ page }) => {
    await open(page, '/novedades?genero=mujer&talla=M');
    const chips = page.getByTestId('filters-sidebar').getByTestId('active-filters');
    await expect(chips.locator('[data-filter="genero"]')).toContainText('Género: Mujer');
    await chips.locator('[data-filter="genero"]').click();
    await expect.poll(() => params(page).has('genero')).toBe(false);
    expect(params(page).get('talla')).toBe('M');
    await open(page, '/mujer?genero=hombre&talla=M');
    await expect(page.getByTestId('filters-sidebar').locator('[data-filter="genero"]')).toHaveCount(0);
  });

  test('con teclado: Tab llega a la X y Intro quita el filtro', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    const chip = page.getByTestId('filters-sidebar').locator('[data-filter="categoria"]');
    await chip.focus();
    expect(await chip.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mujer$/);
  });
});

test.describe('drawer, sin JavaScript y responsive (CA-16)', () => {
  test('en el drawer se quita un filtro sin cerrarlo', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&talla=M', 375);
    const chips = await list(page, 375);
    await chips.locator('[data-filter="talla"]').click();
    await expect.poll(() => params(page).has('talla')).toBe(false);
    await expect(page.getByTestId('filters-drawer')).toBeVisible();
    await expect(chips.getByTestId('active-filter')).toHaveCount(1);
    await expect(page.getByTestId('filters-panel-mobile').getByRole('radio', { name: 'M', exact: true })).not.toBeChecked();
  });

  test('el HTML del servidor trae los chips como enlaces a la URL sin ese filtro', async ({ request }) => {
    const html = await (await request.get('/mujer?categoria=blusas&talla=M')).text();
    expect(html).toContain('data-testid="active-filters"');
    expect(html).toMatch(/href="\/mujer\?categoria=blusas"[^>]*data-filter="talla"|data-filter="talla"[^>]*href="\/mujer\?categoria=blusas"/);
  });

  test.describe('con JavaScript desactivado', () => {
    test.use({ javaScriptEnabled: false });

    test('quitar un filtro funciona como un enlace normal', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/mujer?categoria=blusas&talla=M');
      await page.getByTestId('filters-sidebar').locator('[data-filter="talla"]').click();
      await expect(page).toHaveURL(/\/mujer\?categoria=blusas$/);
    });
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal ni chips cortados a ${width} px`, async ({ page }) => {
      await open(page, ALL, width);
      const chips = await list(page, width);
      const box = await chips.boundingBox();
      const viewport = page.viewportSize()?.width ?? width;
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport + 0.5);
      const count = await chips.getByTestId('active-filter').count();
      for (let i = 0; i < count; i++) {
        const chip = await chips.getByTestId('active-filter').nth(i).boundingBox();
        expect((chip?.x ?? 0) + (chip?.width ?? 0)).toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0) + 0.5);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const width of [375, 1280]) {
    test(`axe sin violaciones graves a ${width} px`, async ({ page }) => {
      await open(page, ALL, width);
      await list(page, width);
      const results = await new AxeBuilder({ page })
        .include(width >= 1024 ? '[data-testid="filters-sidebar"]' : '[data-testid="filters-drawer"]')
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
