import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-14 (T-078, Enmienda 5 de SPEC-002): filtros en lista vertical con casilla, selección única y sin «Todas».

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

async function panel(page: Page, width: number): Promise<Locator> {
  if (width >= 1024) return page.getByTestId('filters-panel');
  await page.getByTestId('filters-open').click();
  await expect(page.getByTestId('filters-drawer')).toBeVisible();
  return page.getByTestId('filters-panel-mobile');
}

const section = (form: Locator, name: string) =>
  form.getByTestId('filters-section').filter({ has: form.page().getByText(name, { exact: true }) });

test.describe('lista vertical (CA-14)', () => {
  for (const width of [375, 1280]) {
    test(`a ${width} px: categoría y ocasión son una columna de filas de ≥ 44 px, sin «Todas»`, async ({ page }) => {
      await open(page, '/mujer', width);
      const form = await panel(page, width);
      for (const name of ['Categoría', 'Ocasión']) {
        const options = section(form, name).getByTestId('filters-options');
        expect(await options.evaluate((el) => getComputedStyle(el).flexWrap)).toBe('nowrap');
        expect(await options.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
        const rows = options.locator('label');
        const count = await rows.count();
        expect(count).toBeGreaterThan(1);
        const xs = new Set<number>();
        let previousBottom = -Infinity;
        for (let i = 0; i < count; i++) {
          const box = await rows.nth(i).boundingBox();
          expect(box?.height ?? 0, `${name} fila ${i}`).toBeGreaterThanOrEqual(44);
          // Una sola columna: todas empiezan en la misma x y cada una va debajo de la anterior.
          xs.add(Math.round(box?.x ?? 0));
          expect(box?.y ?? 0).toBeGreaterThanOrEqual(previousBottom - 1);
          previousBottom = (box?.y ?? 0) + (box?.height ?? 0);
        }
        expect(xs.size, `${name} en una columna`).toBe(1);
      }
      await expect(form.getByRole('radio', { name: 'Todas' })).toHaveCount(0);
      await expect(form.getByText('Todas', { exact: true })).toHaveCount(0);
    });
  }

  test('cada opción lleva su casilla y el nombre al lado, en text-sm', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    const row = form.getByTestId('filters-section').first().locator('label').first();
    const box = await row.locator('span[aria-hidden="true"]').first().boundingBox();
    const text = await row.locator('span.min-w-0').boundingBox();
    expect(box && text).toBeTruthy();
    if (!box || !text) return;
    expect(text.x).toBeGreaterThan(box.x + box.width);
    expect(Math.abs(box.y + box.height / 2 - (text.y + text.height / 2))).toBeLessThanOrEqual(2);
    expect(await row.evaluate((el) => getComputedStyle(el).fontSize)).toBe('14px');
  });

  test('la talla va en dos columnas', async ({ page }) => {
    await open(page, '/mujer');
    const options = section(page.getByTestId('filters-panel'), 'Talla').getByTestId('filters-options');
    const xs = await options.locator('label').evaluateAll((rows) => rows.map((r) => Math.round(r.getBoundingClientRect().left)));
    expect(new Set(xs).size).toBe(2);
  });

  test('el color lleva su círculo decorativo y el nombre al lado', async ({ page }) => {
    await open(page, '/mujer');
    const colors = section(page.getByTestId('filters-panel'), 'Color').getByTestId('filters-options');
    const rows = colors.locator('label');
    const count = await rows.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const swatch = row.getByTestId('filters-swatch');
      await expect(swatch).toHaveAttribute('aria-hidden', 'true');
      expect(await swatch.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px');
      const circle = await swatch.boundingBox();
      const name = await row.locator('span.min-w-0').boundingBox();
      expect(name?.x ?? 0).toBeGreaterThan((circle?.x ?? 0) + (circle?.width ?? 0));
      // El nombre del color es el texto accesible de la opción, no el círculo.
      expect((await row.innerText()).trim().length).toBeGreaterThan(2);
    }
    await expect(colors.getByRole('radio', { name: 'Negro' })).toBeAttached();
  });
});

test.describe('elegir una opción (CA-14)', () => {
  test('aplica el filtro sin recargar y deja marcada solo esa; la marca es un icono', async ({ page }) => {
    await open(page, '/mujer');
    await markDocument(page);
    const form = page.getByTestId('filters-panel');
    await form.getByText('Blusas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(form.getByRole('radio', { name: 'Blusas' })).toBeChecked();
    await expect(form.getByRole('radio', { name: 'Camisas' })).not.toBeChecked();
    await expectNoReload(page);
    // La marca es un icono visible dentro de la casilla (no solo color).
    const row = form.locator('label', { has: page.getByRole('radio', { name: 'Blusas' }) });
    await expect(row.locator('svg.lucide-check')).toBeVisible();
    await form.getByText('Camisas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=camisas/);
    await expect(form.getByRole('radio', { name: 'Blusas' })).not.toBeChecked();
  });

  test('con teclado: foco visible en la casilla y las flechas cambian de opción dentro del grupo', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    const first = form.getByRole('radio', { name: 'Polos' });
    await first.focus();
    const outline = await first.evaluate((el) => {
      const box = el.parentElement?.querySelector('span[aria-hidden="true"]');
      return box ? getComputedStyle(box).outlineStyle : 'none';
    });
    expect(outline).not.toBe('none');
    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(/categoria=camisas/);
    await expect(form.getByRole('radio', { name: 'Camisas' })).toBeFocused();
  });

  test('elegir talla y color a la vez deja ambos en la URL', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    await form.getByText('M', { exact: true }).click();
    await expect(page).toHaveURL(/talla=M/);
    await form.getByText('Negro', { exact: true }).click();
    await expect(page).toHaveURL(/talla=M/);
    await expect(page).toHaveURL(/color=negro/);
  });
});

test.describe('«Limpiar» (CA-14)', () => {
  test('solo aparece con filtros activos, los quita todos y conserva el orden', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    await expect(form.getByRole('link', { name: 'Limpiar' })).toHaveCount(0);
    await form.getByText('Blusas', { exact: true }).click();
    await expect(form.getByRole('link', { name: 'Limpiar' })).toBeVisible();
    await page.locator('select[name="orden"]').selectOption('precio-asc');
    await expect(page).toHaveURL(/orden=precio-asc/);
    await form.getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer\?orden=precio-asc$/);
    await expect(form.getByRole('radio', { name: 'Blusas' })).not.toBeChecked();
    await expect(form.getByRole('link', { name: 'Limpiar' })).toHaveCount(0);
  });

  test('el precio también cuenta como filtro activo para mostrarlo', async ({ page }) => {
    await open(page, '/mujer?max=60');
    await expect(page.getByTestId('filters-panel').getByRole('link', { name: 'Limpiar' })).toBeVisible();
  });
});

test.describe('sin JavaScript y sin scroll horizontal (CA-14)', () => {
  test('el HTML del servidor trae radios por categoría y ninguna opción «Todas»', async ({ request }) => {
    const html = await (await request.get('/mujer?categoria=blusas')).text();
    expect(html).toContain('name="categoria" value="blusas"');
    expect(html).not.toContain('name="categoria" value=""');
    expect(html).toContain('Aplicar filtros');
  });

  test.describe('con JavaScript desactivado', () => {
    test.use({ javaScriptEnabled: false });

    test('elegir una opción y pulsar «Aplicar filtros» aplica el filtro', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/mujer');
      const form = page.getByTestId('filters-panel');
      await form.getByText('Faldas', { exact: true }).click();
      await form.getByRole('button', { name: 'Aplicar filtros' }).click();
      await expect(page).toHaveURL(/categoria=faldas/);
    });
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal a ${width} px`, async ({ page }) => {
      await open(page, '/mujer?categoria=blusas&color=negro', width);
      await panel(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('accesibilidad (CA-14)', () => {
  for (const width of [375, 1280]) {
    test(`axe sin violaciones graves a ${width} px`, async ({ page }) => {
      await open(page, '/mujer?categoria=blusas&color=negro', width);
      await panel(page, width);
      const results = await new AxeBuilder({ page })
        .include(width >= 1024 ? '[data-testid="filters-sidebar"]' : '[data-testid="filters-drawer"]')
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
