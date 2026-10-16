import { test, expect, type Page } from '@playwright/test';

// SPEC-001 T-027: guía de tallas desde la ficha (RF-18, CA-31, test `size-guide`). Requiere el seed
// `supabase/seed/size-guides-demo.sql`. Producto de camisas: «camisa-oxford-algodon» (hombre).

const SHIRT = '/producto/camisa-oxford-algodon';
const TROUSERS = '/producto/pantalon-chino-slim';

const trigger = (page: Page) => page.locator('[data-testid="size-guide-open"]');
const modal = (page: Page) => page.locator('[data-testid="size-guide-modal"]');

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('CA-31: la guía muestra la tabla de la categoría de la ficha', () => {
  test('en una camisa se abre la tabla de camisas', async ({ page }) => {
    await open(page, SHIRT);
    await expect(modal(page)).toBeHidden();
    await trigger(page).click();

    await expect(modal(page)).toBeVisible();
    await expect(modal(page)).toHaveAttribute('role', 'dialog');
    await expect(modal(page)).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('dialog', { name: /Guía de tallas: Camisas/ })).toBeVisible();

    const table = modal(page).getByRole('table', { name: 'Guía de tallas: Camisas' });
    await expect(table).toBeVisible();
    // Las medidas de camisas incluyen cuello y manga.
    await expect(table.getByRole('columnheader', { name: 'Cuello (cm)' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Manga (cm)' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'M' })).toBeVisible();
  });

  test('en un pantalón se abre la tabla de pantalones, distinta de la de camisas', async ({
    page,
  }) => {
    await open(page, TROUSERS);
    await trigger(page).click();
    const table = modal(page).getByRole('table', { name: 'Guía de tallas: Pantalones' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Cintura (cm)' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Cuello (cm)' })).toHaveCount(0);
  });

  test('la tabla es semántica y las cabeceras de fila son las tallas', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    const table = modal(page).getByRole('table');
    expect(await table.getByRole('columnheader').allInnerTexts()).toEqual([
      'Talla',
      'Cuello (cm)',
      'Pecho (cm)',
      'Manga (cm)',
    ]);
    expect(await table.getByRole('rowheader').allInnerTexts()).toEqual(['S', 'M', 'L', 'XL']);
  });

  test('indica que las medidas son de ejemplo', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    await expect(modal(page)).toContainText('Medidas de ejemplo');
  });
});

test.describe('cierre y teclado', () => {
  test('Esc cierra y el foco vuelve al enlace', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    await expect(page.locator('[data-testid="size-guide-close"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('el botón de cerrar cierra y mide ≥ 44 px', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    const close = page.locator('[data-testid="size-guide-close"]');
    const box = await close.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(modal(page)).toBeHidden();
  });

  test('pulsar fuera del panel cierra', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    await expect(modal(page)).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(modal(page)).toBeHidden();
  });

  test('pulsar dentro del panel no cierra', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    await modal(page).getByRole('table').click();
    await expect(modal(page)).toBeVisible();
  });

  test('con el panel abierto no se desplaza la página y al cerrar se libera', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe('hidden');
  });

  test('el foco no sale del panel', async ({ page }) => {
    await open(page, SHIRT);
    await trigger(page).click();
    await expect(modal(page)).toBeVisible();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="size-guide-modal"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(inside, `tabulación ${i + 1} fuera del panel`).toBe(true);
    }
  });

  test('abrir y cerrar no recarga el documento ni deja # en la URL', async ({ page }) => {
    await open(page, SHIRT);
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga?: boolean }).__sinRecarga = true;
    });
    await trigger(page).click();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    const marca = await page.evaluate(
      () => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga,
    );
    expect(marca).toBe(true);
    expect(page.url()).not.toContain('#');
  });

  test('entrar con #guia-de-tallas abre el panel', async ({ page }) => {
    await open(page, `${SHIRT}#guia-de-tallas`);
    await expect(modal(page)).toBeVisible();
    await expect(page.locator('[data-testid="size-guide-close"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    expect(page.url()).not.toContain('#');
  });
});

test.describe('sin JavaScript', () => {
  test('el enlace abre la tabla con :target y «Cerrar» la cierra', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(SHIRT);
    await expect(modal(page)).toBeHidden();
    await trigger(page).click();
    await expect(modal(page)).toBeVisible();
    await expect(modal(page).getByRole('table', { name: 'Guía de tallas: Camisas' })).toBeVisible();
    await page.locator('[data-testid="size-guide-close"]').click();
    await expect(modal(page)).toBeHidden();
    await context.close();
  });
});

test.describe('interfaz', () => {
  for (const width of [320, 375, 768, 1280]) {
    test(`a ${width} px no hay desbordamiento de la página con la guía abierta`, async ({ page }) => {
      await open(page, SHIRT, width);
      await trigger(page).click();
      await expect(modal(page)).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      // La tabla cabe en el panel o se desplaza dentro de su región, no ensancha la página.
      const region = modal(page).getByRole('region', { name: /Tabla de tallas/ });
      const box = await region.boundingBox();
      expect(box).not.toBeNull();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    });
  }

  test('el enlace «Guía de tallas» mide al menos 44 px de alto', async ({ page }) => {
    await open(page, SHIRT, 375);
    const box = await trigger(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
