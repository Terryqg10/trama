import { test, expect, type Page } from '@playwright/test';

// SPEC-001 Enmienda 7 / T-014: chevrón de lucide en «Ordenar por» (CA-51) y controles del
// catálogo alineados a 320, 375, 768 y 1280 px (CA-52).

const WIDTHS = [320, 375, 768, 1280] as const;

async function openFilters(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto('/mujer');
  await expect(page.locator('article').first()).toBeVisible();
  const open = page.locator('[data-testid="filters-open"]');
  if (await open.isVisible()) await open.click();
}

/** «Ordenar por» está en la barra sobre el listado (Enmienda 4, T-073): no hace falta abrir el drawer. */
async function openCatalog(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 812 });
  await page.goto('/mujer');
  await expect(page.locator('article').first()).toBeVisible();
  await page.locator('select[name="orden"]:visible').evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
}

test.describe('CA-51: «Ordenar por» lleva el chevrón de lucide, no el nativo', () => {
  for (const width of [375, 1280]) {
    test(`a ${width} px`, async ({ page }) => {
      await openCatalog(page, width);
      const select = page.locator('select[name="orden"]:visible');
      const chevron = select.locator('xpath=following-sibling::*[@data-testid="filters-sort-chevron"]');

      // Sin apariencia nativa: el navegador no dibuja su propio chevrón.
      const appearance = await select.evaluate((el) => {
        const style = getComputedStyle(el);
        return style.appearance || style.getPropertyValue('-webkit-appearance');
      });
      expect(appearance).toBe('none');

      // El icono es un SVG de lucide, decorativo y que no bloquea clics.
      await expect(chevron).toBeVisible();
      expect(await chevron.evaluate((el) => el.tagName.toLowerCase())).toBe('svg');
      expect(await chevron.evaluate((el) => el.getAttribute('class') ?? '')).toContain('lucide');
      await expect(chevron).toHaveAttribute('aria-hidden', 'true');
      expect(await chevron.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');

      const selectBox = await select.boundingBox();
      const chevronBox = await chevron.boundingBox();
      expect(selectBox).not.toBeNull();
      expect(chevronBox).not.toBeNull();
      if (!selectBox || !chevronBox) return;

      // Dentro del control, centrado en vertical.
      expect(chevronBox.x).toBeGreaterThanOrEqual(selectBox.x);
      expect(chevronBox.x + chevronBox.width).toBeLessThanOrEqual(selectBox.x + selectBox.width);
      const selectCenter = selectBox.y + selectBox.height / 2;
      const chevronCenter = chevronBox.y + chevronBox.height / 2;
      expect(Math.abs(selectCenter - chevronCenter)).toBeLessThanOrEqual(1);

      // Alineado con el padding horizontal del control: la distancia al borde derecho es la
      // misma que la del texto al borde izquierdo (px-4).
      const paddingLeft = await select.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
      const gapRight = selectBox.x + selectBox.width - (chevronBox.x + chevronBox.width);
      expect(Math.abs(gapRight - paddingLeft)).toBeLessThanOrEqual(2);

      // El texto no choca con el icono: el padding derecho cubre el icono y un margen.
      const paddingRight = await select.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
      expect(paddingRight).toBeGreaterThanOrEqual(gapRight + chevronBox.width);
    });
  }

  test('pulsar sobre el chevrón abre el select (no bloquea clics) y se puede cambiar', async ({
    page,
  }) => {
    await openCatalog(page, 1280);
    const select = page.locator('select[name="orden"]:visible');
    const box = await select.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // Clic donde está el chevrón: el elemento bajo el puntero debe ser el select.
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName.toLowerCase(),
      { x: box.x + box.width - 24, y: box.y + box.height / 2 },
    );
    expect(hit).toBe('select');
    await select.selectOption('precio-asc');
    await expect(page).toHaveURL(/orden=precio-asc/);
  });
});

test.describe('CA-52: controles alineados a 320, 375, 768 y 1280 px', () => {
  for (const width of WIDTHS) {
    test(`a ${width} px`, async ({ page }) => {
      await openFilters(page, width);
      const form = page.locator('form:visible:not([role="search"])').first();
      const formBox = await form.boundingBox();
      expect(formBox).not.toBeNull();
      if (!formBox) return;

      // Ningún control se sale del formulario ni del viewport.
      const controls = form.locator(
        'select:visible, input[type="number"]:visible, button:visible, a:visible, label:visible',
      );
      const count = await controls.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await controls.nth(i).boundingBox();
        if (!box) continue;
        expect(box.x, `control ${i} empieza a la izquierda del viewport`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `control ${i} se sale por la derecha`).toBeLessThanOrEqual(width + 0.5);
      }

      // Los botones de acción caben en una sola línea (sin texto partido).
      for (const name of ['Aplicar filtros']) {
        const button = form.getByRole('button', { name });
        const height = (await button.boundingBox())?.height ?? 0;
        expect(height, `«${name}» en una línea`).toBeLessThanOrEqual(48);
      }

      // Campos de texto/número y select con la misma altura mínima y el mismo padding.
      const fields = form.locator('select:visible, input[type="number"]:visible');
      const fieldCount = await fields.count();
      const paddings = new Set<string>();
      for (let i = 0; i < fieldCount; i++) {
        const box = await fields.nth(i).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        paddings.add(await fields.nth(i).evaluate((el) => getComputedStyle(el).paddingLeft));
      }
      expect(paddings.size, 'mismo padding izquierdo en todos los campos').toBe(1);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test('en el drawer el pie queda pegado al fondo del viewport', async ({ page }) => {
    for (const width of [320, 375, 768]) {
      await openFilters(page, width);
      // Como antes de T-073 (cuando el último campo era «Ordenar por»): se lleva el final del formulario a la vista.
      await page.locator('[data-testid="filters-drawer"] [data-testid="price-max"]').evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
      });
      const footer = page.locator('[data-testid="filters-drawer"]').getByRole('button', {
        name: 'Aplicar filtros',
      });
      const box = await footer.boundingBox();
      const viewportHeight = page.viewportSize()?.height ?? 0;
      expect(box).not.toBeNull();
      if (box) {
        // El botón está en la franja inferior (pie de ≈ 68 px) y no deja un hueco bajo él.
        expect(box.y + box.height, `pie a ${width} px`).toBeGreaterThan(viewportHeight - 24);
        expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
      }
    }
  });
});
