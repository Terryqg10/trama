import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// CA-15 (T-079, Enmienda 6 de SPEC-002): intervalo de precio con dos tiradores, números en tiempo real y filtrado al soltar.

async function open(page: Page, url = '/mujer', width = 1280): Promise<Locator> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
  let form: Locator;
  if (width >= 1024) {
    form = page.getByTestId('filters-panel');
  } else {
    await page.getByTestId('filters-open').click();
    await expect(page.getByTestId('filters-drawer')).toBeVisible();
    form = page.getByTestId('filters-panel-mobile');
  }
  await expect(form.getByTestId('price-range')).toBeVisible();
  await form.getByTestId('price-slider').scrollIntoViewIfNeeded();
  return form;
}

const thumbMin = (form: Locator) => form.getByTestId('price-thumb-min');
const thumbMax = (form: Locator) => form.getByTestId('price-thumb-max');
const fieldMin = (form: Locator) => form.getByTestId('price-min');
const fieldMax = (form: Locator) => form.getByTestId('price-max');

interface Bounds {
  readonly min: number;
  readonly max: number;
}

async function bounds(form: Locator): Promise<Bounds> {
  const input = thumbMin(form);
  return {
    min: Number(await input.getAttribute('min')),
    max: Number(await input.getAttribute('max')),
  };
}

/** Centro del tirador en pantalla: el `range` mide el ancho de la pista y el tirador (44 px) no sale de ella. */
async function thumbCenter(input: Locator, value: number, range: Bounds): Promise<{ x: number; y: number }> {
  const box = await input.boundingBox();
  if (!box) throw new Error('tirador sin caja');
  const fraction = (value - range.min) / (range.max - range.min);
  return { x: box.x + 22 + fraction * (box.width - 44), y: box.y + box.height / 2 };
}

const urlHas = (page: Page, key: string) => new URL(page.url()).searchParams.has(key);
const urlValue = (page: Page, key: string) => new URL(page.url()).searchParams.get(key);

test.describe('intervalo de precio (CA-15)', () => {
  test('hay dos tiradores y una barra con el tramo, con los límites del catálogo y los números en sus extremos', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    expect(range.max).toBeGreaterThan(range.min);
    await expect(thumbMax(form)).toHaveAttribute('min', String(range.min));
    await expect(thumbMax(form)).toHaveAttribute('max', String(range.max));
    await expect(thumbMin(form)).toHaveValue(String(range.min));
    await expect(thumbMax(form)).toHaveValue(String(range.max));
    await expect(fieldMin(form)).toHaveValue(String(range.min));
    await expect(fieldMax(form)).toHaveValue(String(range.max));
    // La barra del tramo ocupa toda la pista cuando no hay filtro.
    const fill = await form.getByTestId('price-range-fill').boundingBox();
    const slider = await form.getByTestId('price-slider').boundingBox();
    expect((fill?.width ?? 0) / ((slider?.width ?? 1) - 44)).toBeGreaterThan(0.99);
  });

  test('cada tirador tiene nombre accesible, valor con «€» y 44 px de alto', async ({ page }) => {
    const form = await open(page);
    await expect(form.getByRole('slider', { name: 'Precio mínimo (deslizador)' })).toBeVisible();
    await expect(form.getByRole('slider', { name: 'Precio máximo (deslizador)' })).toBeVisible();
    const { max } = await bounds(form);
    await expect(thumbMax(form)).toHaveAttribute('aria-valuetext', `${max} €`);
    for (const input of [thumbMin(form), thumbMax(form)]) {
      expect((await input.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('al arrastrar, los números cambian en tiempo real y la URL no; al soltar filtra sin recargar', async ({ page }) => {
    const form = await open(page);
    await markDocument(page);
    const range = await bounds(form);
    const target = Math.round(range.min + (range.max - range.min) * 0.4);
    const start = await thumbCenter(thumbMax(form), range.max, range);
    const end = await thumbCenter(thumbMax(form), target, range);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move((start.x + end.x) / 2, start.y, { steps: 6 });
    // En mitad del gesto: el número ya ha cambiado y el listado todavía no se ha filtrado.
    await expect.poll(async () => Number(await fieldMax(form).inputValue())).toBeLessThan(range.max);
    await page.waitForTimeout(700);
    expect(urlHas(page, 'max')).toBe(false);
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => urlValue(page, 'max')).not.toBeNull();
    const applied = Number(urlValue(page, 'max'));
    expect(Math.abs(applied - target)).toBeLessThanOrEqual(2);
    await expect(fieldMax(form)).toHaveValue(String(applied));
    await expect(thumbMax(form)).toHaveValue(String(applied));
    await expectNoReload(page);
    // El listado cumple el máximo.
    await expect
      .poll(async () => {
        const prices = await page.locator('article').evaluateAll((cards) =>
          cards.map((card) => {
            const match = /(\d+),(\d{2})\s*€/.exec(card.textContent ?? '');
            return match ? Number(match[1]) + Number(match[2]) / 100 : Number.NaN;
          }),
        );
        return prices.length > 0 && prices.every((price) => price <= applied);
      })
      .toBe(true);
  });

  test('con teclado: las flechas mueven el tirador y los números al instante; filtra tras una pausa; Inicio y Fin llegan a los límites', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    await thumbMax(form).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    await expect(fieldMax(form)).toHaveValue(String(range.max - 5));
    await expect(thumbMax(form)).toHaveAttribute('aria-valuetext', `${range.max - 5} €`);
    await expect.poll(() => urlValue(page, 'max'), { timeout: 5000 }).toBe(String(range.max - 5));
    await thumbMin(form).focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('PageUp');
    // PageUp salta un tramo mayor que una flecha (no son 10 €): se comprueba que el número y la URL coinciden.
    await expect.poll(async () => Number(await fieldMin(form).inputValue())).toBeGreaterThan(range.min + 1);
    const jumped = await fieldMin(form).inputValue();
    await expect.poll(() => urlValue(page, 'min'), { timeout: 5000 }).toBe(jumped);
    await page.keyboard.press('Home');
    await expect(fieldMin(form)).toHaveValue(String(range.min));
  });

  test('un extremo en su límite no se filtra: la URL pierde ese parámetro', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    await thumbMin(form).focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => urlValue(page, 'min'), { timeout: 5000 }).toBe(String(range.min + 1));
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => urlHas(page, 'min'), { timeout: 5000 }).toBe(false);
    await expect(page.getByTestId('filters-panel').getByRole('link', { name: 'Limpiar' })).toHaveCount(0);
  });

  test('los tiradores no se cruzan', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    const limit = Math.round(range.min + (range.max - range.min) / 2);
    await fieldMax(form).fill(String(limit));
    await fieldMax(form).press('Enter');
    await expect.poll(() => urlValue(page, 'max')).toBe(String(limit));
    await thumbMin(form).focus();
    await page.keyboard.press('End');
    await expect(thumbMin(form)).toHaveValue(String(limit));
    await expect(fieldMin(form)).toHaveValue(String(limit));
    // Escribir un mínimo mayor que el máximo se queda en el máximo.
    await fieldMin(form).fill(String(range.max));
    await fieldMin(form).press('Enter');
    await expect(fieldMin(form)).toHaveValue(String(limit));
  });

  test('escribir en los campos y pulsar Intro mueve los tiradores y filtra', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    const value = range.min + 12;
    await fieldMin(form).fill(String(value));
    await page.waitForTimeout(600);
    expect(urlHas(page, 'min')).toBe(false);
    await fieldMin(form).press('Enter');
    await expect.poll(() => urlValue(page, 'min')).toBe(String(value));
    await expect(thumbMin(form)).toHaveValue(String(value));
    const fill = await form.getByTestId('price-range-fill').boundingBox();
    const slider = await form.getByTestId('price-slider').boundingBox();
    expect((fill?.x ?? 0) - (slider?.x ?? 0)).toBeGreaterThan(22);
  });

  test('«Limpiar» y «Atrás» devuelven los tiradores y los números a la URL', async ({ page }) => {
    const base = await open(page, '/mujer');
    const range = await bounds(base);
    const lo = range.min + 10;
    const hi = range.max - 10;
    await page.goto(`/mujer?min=${lo}&max=${hi}`);
    const form = page.getByTestId('filters-panel');
    await expect(form.getByTestId('price-range')).toBeVisible();
    await expect(thumbMin(form)).toHaveValue(String(lo));
    await expect(thumbMax(form)).toHaveValue(String(hi));
    await expect(fieldMin(form)).toHaveValue(String(lo));
    await expect(fieldMax(form)).toHaveValue(String(hi));
    await form.getByRole('link', { name: 'Limpiar' }).click();
    await expect(thumbMin(form)).toHaveValue(String(range.min));
    await expect(thumbMax(form)).toHaveValue(String(range.max));
    await expect(fieldMax(form)).toHaveValue(String(range.max));
    await page.goBack();
    await expect(thumbMin(form)).toHaveValue(String(lo));
    await expect(fieldMax(form)).toHaveValue(String(hi));
  });

  test('lo que se escribe en un campo no se pierde cuando se aplica el otro', async ({ page }) => {
    const form = await open(page);
    const range = await bounds(form);
    await fieldMin(form).fill(String(range.min + 5));
    // Al pasar al otro campo se aplica el mínimo; el máximo recién escrito sigue ahí.
    await fieldMax(form).fill(String(range.max - 7));
    await expect.poll(() => urlValue(page, 'min')).toBe(String(range.min + 5));
    await expect(fieldMax(form)).toHaveValue(String(range.max - 7));
    await fieldMax(form).press('Enter');
    await expect.poll(() => urlValue(page, 'max')).toBe(String(range.max - 7));
  });

  test('«Aplicar filtros» envía el intervalo y lo combina con otros filtros', async ({ page }) => {
    const form = await open(page, '/mujer?categoria=blusas');
    const range = await bounds(form);
    await fieldMax(form).fill(String(range.max - 3));
    await form.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect.poll(() => urlValue(page, 'max')).toBe(String(range.max - 3));
    await expect(page).toHaveURL(/categoria=blusas/);
  });
});

test.describe('sin JavaScript, foco y responsive (CA-15)', () => {
  test('el HTML del servidor trae los dos campos numéricos con nombre y ningún tirador', async ({ request }) => {
    const html = await (await request.get('/mujer')).text();
    expect(html).toContain('name="min"');
    expect(html).toContain('name="max"');
    expect(html).not.toContain('data-testid="price-thumb-min"');
  });

  test.describe('con JavaScript desactivado', () => {
    test.use({ javaScriptEnabled: false });

    test('siguen los dos campos y «Aplicar filtros» filtra por precio', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/mujer');
      const form = page.getByTestId('filters-panel');
      await expect(form.getByTestId('price-slider')).toHaveCount(0);
      await form.getByLabel('Precio máximo (€)').fill('60');
      await form.getByRole('button', { name: 'Aplicar filtros' }).click();
      await expect(page).toHaveURL(/max=60/);
    });
  });

  test('el tirador enfocado con teclado muestra un aro visible', async ({ page }) => {
    const form = await open(page, '/mujer?min=30');
    const thumb = thumbMin(form);
    const range = { min: Number(await thumb.getAttribute('min')), max: Number(await thumb.getAttribute('max')) };
    const center = await thumbCenter(thumb, 30, range);
    // El aro rodea el tirador (28 px visibles): se compara la zona de 52 px antes y después de enfocarlo.
    const clip = { x: center.x - 26, y: center.y - 26, width: 52, height: 52 };
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    const without = await page.screenshot({ clip });
    await thumb.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await expect(thumb).toBeFocused();
    const withFocus = await page.screenshot({ clip });
    expect(withFocus.equals(without)).toBe(false);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal y con los tiradores dentro del panel a ${width} px`, async ({ page }) => {
      const form = await open(page, '/mujer?min=15', width);
      const panelBox = await form.boundingBox();
      const slider = await form.getByTestId('price-slider').boundingBox();
      expect(slider && panelBox).toBeTruthy();
      expect((slider?.x ?? 0) + (slider?.width ?? 0)).toBeLessThanOrEqual((panelBox?.x ?? 0) + (panelBox?.width ?? 0) + 0.5);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const width of [375, 1280]) {
    test(`axe sin violaciones graves a ${width} px`, async ({ page }) => {
      await open(page, '/mujer?min=15', width);
      const results = await new AxeBuilder({ page })
        .include(width >= 1024 ? '[data-testid="filters-sidebar"]' : '[data-testid="filters-drawer"]')
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

// CA-15 + CA-16 (Enmienda 7): en el drawer, soltar el tirador filtra sin cerrarlo y «Mín.» y «Máx.» siguen a la vista.
test.describe('drawer: el intervalo no cierra el panel (CA-15)', () => {
  for (const width of [375, 800]) {
    test(`a ${width} px: soltar el tirador con el ratón filtra y el drawer sigue abierto con los valores`, async ({ page }) => {
      const form = await open(page, '/hombre', width);
      const range = await bounds(form);
      const target = Math.round(range.min + (range.max - range.min) * 0.3);
      const start = await thumbCenter(thumbMin(form), range.min, range);
      const end = await thumbCenter(thumbMin(form), target, range);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 });
      await page.mouse.up();
      await expect.poll(() => urlValue(page, 'min')).not.toBeNull();
      const applied = String(urlValue(page, 'min'));
      await expect(page.getByTestId('filters-drawer')).toBeVisible();
      await expect(fieldMin(form)).toBeVisible();
      await expect(fieldMax(form)).toBeVisible();
      await expect(fieldMin(form)).toHaveValue(applied);
      await expect(fieldMax(form)).toHaveValue(String(range.max));
      await expect(thumbMin(form)).toHaveValue(applied);
    });
  }

  test('con teclado y al escribir un valor con Intro el drawer tampoco se cierra', async ({ page }) => {
    const form = await open(page, '/hombre', 375);
    const range = await bounds(form);
    await thumbMax(form).focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => urlValue(page, 'max'), { timeout: 5000 }).toBe(String(range.max - 1));
    await expect(page.getByTestId('filters-drawer')).toBeVisible();
    await fieldMin(form).fill(String(range.min + 4));
    await fieldMin(form).press('Enter');
    await expect.poll(() => urlValue(page, 'min')).toBe(String(range.min + 4));
    await expect(page.getByTestId('filters-drawer')).toBeVisible();
    await expect(fieldMin(form)).toHaveValue(String(range.min + 4));
    await expect(fieldMax(form)).toHaveValue(String(range.max - 1));
  });

  test('«Aplicar filtros» sí cierra el drawer (como antes)', async ({ page }) => {
    const form = await open(page, '/hombre', 375);
    await fieldMax(form).fill(String((await bounds(form)).max - 2));
    await form.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page.getByTestId('filters-drawer')).toBeHidden();
  });
});
