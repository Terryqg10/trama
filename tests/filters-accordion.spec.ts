import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-13 (T-074, Enmienda 4 de SPEC-002): filtros en acordeones nativos y precio Mín./Máx. en una fila.

const SECTIONS = ['Categoría', 'Ocasión', 'Talla', 'Color'] as const;

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

/** Panel visible: la columna lateral desde 1024 px y el drawer (abierto) por debajo. */
async function panel(page: Page, width: number): Promise<Locator> {
  if (width >= 1024) return page.getByTestId('filters-panel');
  await page.getByTestId('filters-open').click();
  await expect(page.getByTestId('filters-drawer')).toBeVisible();
  return page.getByTestId('filters-panel-mobile');
}

const section = (form: Locator, name: string) =>
  form.getByTestId('filters-section').filter({ has: form.page().getByText(name, { exact: true }) });

test.describe('acordeones nativos (CA-13)', () => {
  for (const width of [375, 1280]) {
    test(`a ${width} px: categoría, ocasión, talla y color son <details> abiertos de 44 px`, async ({ page }) => {
      await open(page, '/mujer', width);
      const form = await panel(page, width);
      const sections = form.getByTestId('filters-section');
      await expect(sections).toHaveCount(4);
      for (const name of SECTIONS) {
        const item = section(form, name);
        await expect(item).toHaveJSProperty('open', true);
        await expect(item.locator('summary')).toContainText(name);
        expect((await item.locator('summary').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
        // Cada sección es un <details> nativo con su <summary>.
        expect(await item.evaluate((el) => el.tagName.toLowerCase())).toBe('details');
      }
    });
  }

  test('se pliega y se abre con el teclado (Intro y Espacio) y el foco se queda en el título', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    const item = section(form, 'Talla');
    const summary = item.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(item).toHaveJSProperty('open', false);
    await expect(item.getByRole('radio', { name: 'M', exact: true })).toBeHidden();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Space');
    await expect(item).toHaveJSProperty('open', true);
    await expect(item.getByRole('radio', { name: 'M', exact: true })).toBeAttached();
    await expect(summary).toBeFocused();
  });

  test('el foco es visible en el título de cada sección', async ({ page }) => {
    await open(page, '/mujer');
    const summary = page.getByTestId('filters-panel').locator('summary').first();
    await summary.focus();
    expect(await summary.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  });

  test('plegar una sección no pierde el filtro marcado y el título lo indica', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    const form = page.getByTestId('filters-panel');
    const item = section(form, 'Categoría');
    await expect(item.getByTestId('filters-section-count')).toHaveText('1 activo');
    await expect(section(form, 'Talla').getByTestId('filters-section-count')).toHaveCount(0);
    await item.locator('summary').click();
    await expect(item).toHaveJSProperty('open', false);
    // Con la sección plegada, aplicar el precio conserva la categoría.
    await form.getByTestId('price-max').fill('90');
    await form.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(page).toHaveURL(/max=90/);
  });

  test('en el drawer también se pliegan, sin perder el drawer abierto', async ({ page }) => {
    await open(page, '/mujer', 375);
    const form = await panel(page, 375);
    const item = section(form, 'Color');
    await item.locator('summary').click();
    await expect(item).toHaveJSProperty('open', false);
    await expect(page.getByTestId('filters-drawer')).toBeVisible();
    await item.locator('summary').click();
    await expect(item).toHaveJSProperty('open', true);
  });

  test('con JavaScript desactivado los acordeones están abiertos y se pliegan igualmente', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto('/mujer');
    const item = section(page.getByTestId('filters-panel'), 'Ocasión');
    await expect(item).toHaveJSProperty('open', true);
    await item.locator('summary').click();
    await expect(item).toHaveJSProperty('open', false);
    await context.close();
  });
});

test.describe('precio Mín. y Máx. (CA-13)', () => {
  for (const width of [320, 375, 768, 1280]) {
    test(`a ${width} px: dos campos en una fila con guion y «€», sin salirse del panel`, async ({ page }) => {
      await open(page, '/mujer', width);
      const form = await panel(page, width);
      // Espera a que el intervalo sustituya a los campos de antes de hidratar.
      await expect(form.getByTestId('price-range')).toBeVisible();
      const min = form.getByLabel('Precio mínimo (€)');
      const max = form.getByLabel('Precio máximo (€)');
      await expect(min).toHaveAttribute('placeholder', 'Mín.');
      await expect(max).toHaveAttribute('placeholder', 'Máx.');
      const a = await min.boundingBox();
      const b = await max.boundingBox();
      const f = await form.boundingBox();
      expect(a && b && f).toBeTruthy();
      if (!a || !b || !f) return;
      // Misma fila (misma altura y mismo `top`), de izquierda a derecha, con hueco para el guion.
      expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
      expect(b.x).toBeGreaterThan(a.x + a.width);
      expect(a.height).toBeGreaterThanOrEqual(44);
      expect(a.x).toBeGreaterThanOrEqual(f.x);
      expect(b.x + b.width).toBeLessThanOrEqual(f.x + f.width + 0.5);
      // El guion y el «€» están dentro de la fila.
      const group = form.getByRole('group', { name: 'Precio' });
      await expect(group).toContainText('–');
      await expect(group.locator('span[aria-hidden="true"]', { hasText: '€' })).toHaveCount(2);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('se aplican con Intro, al salir del campo y con «Aplicar filtros», no al escribir', async ({ page }) => {
    await open(page, '/mujer');
    const form = page.getByTestId('filters-panel');
    // Espera a que el intervalo sustituya a los campos de antes de hidratar: lo escrito antes se pierde y el test fallaba a veces.
    await expect(form.getByTestId('price-range')).toBeVisible();
    await form.getByLabel('Precio mínimo (€)').fill('30');
    // Escribir no filtra: no hay petición por cada tecla (Enmienda 6).
    await page.waitForTimeout(600);
    expect(page.url()).not.toContain('min=');
    await form.getByLabel('Precio máximo (€)').fill('60');
    await expect(page).toHaveURL(/min=30/);
    await form.getByLabel('Precio máximo (€)').press('Enter');
    await expect(page).toHaveURL(/max=60/);
    // Tras aplicar, los campos conservan el valor.
    await expect(form.getByLabel('Precio mínimo (€)')).toHaveValue('30');
    await expect(form.getByLabel('Precio máximo (€)')).toHaveValue('60');
    await form.getByLabel('Precio máximo (€)').fill('45');
    await form.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/max=45/);
  });

  test('los campos no muestran flechas del navegador (no tapan el «€»)', async ({ page }) => {
    await open(page, '/mujer');
    // Espera a que el intervalo sustituya a los campos de antes de hidratar.
    await expect(page.getByTestId('filters-panel').getByTestId('price-range')).toBeVisible();
    const appearance = await page
      .getByTestId('filters-panel')
      .getByLabel('Precio mínimo (€)')
      .evaluate((el) => getComputedStyle(el).appearance);
    expect(appearance).toBe('textfield');
  });
});

test.describe('accesibilidad del panel (CA-13)', () => {
  for (const width of [375, 1280]) {
    test(`axe sin violaciones graves a ${width} px`, async ({ page }) => {
      await open(page, '/mujer?categoria=blusas', width);
      const form = await panel(page, width);
      await expect(form).toBeVisible();
      const results = await new AxeBuilder({ page }).include(width >= 1024 ? '[data-testid="filters-sidebar"]' : '[data-testid="filters-drawer"]').analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
