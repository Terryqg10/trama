import { test, expect, type Page } from '@playwright/test';

// SPEC-002 / T-008 / ADR-006: chips al clic con navegación blanda y degradación sin JS.

const DESKTOP = { width: 1280, height: 800 };

async function open(page: Page, url: string): Promise<void> {
  await page.setViewportSize(DESKTOP);
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

const names = (page: Page) => page.locator('article h2').allInnerTexts();
const panel = (page: Page) => page.locator('[data-testid="filters-panel"]');

test.describe('CA-03: el chip se aplica al clic, sin recargar', () => {
  test('cambia la URL y el listado sin recargar el documento', async ({ page }) => {
    await open(page, '/mujer');
    const before = (await names(page)).length;
    // Marca en el documento: si la página se recargara, desaparecería.
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga?: boolean }).__sinRecarga = true;
    });

    await panel(page).getByText('Pantalones', { exact: true }).click();

    await expect(page).toHaveURL(/categoria=pantalones/);
    await expect.poll(async () => (await names(page)).length).toBeLessThan(before);
    for (const name of await names(page)) expect(name.toLowerCase()).toContain('pantal');
    const marca = await page.evaluate(
      () => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga,
    );
    expect(marca, 'el documento no se ha recargado').toBe(true);
  });

  test('conserva el scroll y el chip queda marcado', async ({ page }) => {
    await open(page, '/mujer');
    await page.evaluate(() => window.scrollTo(0, 120));
    await panel(page).getByText('Blusas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(panel(page).getByRole('radio', { name: 'Blusas' })).toBeChecked();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('con teclado: mover el radio con las flechas aplica el filtro', async ({ page }) => {
    await open(page, '/mujer');
    await panel(page).getByRole('radio', { name: 'Todas' }).first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/categoria=/);
  });

  test('«Limpiar» deja los chips en «Todas» sin recargar', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&ocasion=vestir');
    await panel(page).getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer$/);
    await expect(panel(page).getByRole('radio', { name: 'Blusas' })).not.toBeChecked();
    await expect(panel(page).getByRole('radio', { name: 'Vestir' })).not.toBeChecked();
    await expect(page.locator('[data-testid="filters-count"]')).toHaveCount(0);
  });

  test('«Atrás» devuelve los chips al estado anterior', async ({ page }) => {
    await open(page, '/mujer');
    await panel(page).getByText('Blusas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await page.goBack();
    await expect(page).toHaveURL(/\/mujer$/);
    await expect(panel(page).getByRole('radio', { name: 'Blusas' })).not.toBeChecked();
  });
});

test.describe('CA-10: «Ordenar por» se aplica al cambiar, sin recargar', () => {
  test('ordena por precio y cambia la URL sin recargar el documento', async ({ page }) => {
    await open(page, '/mujer');
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga?: boolean }).__sinRecarga = true;
    });

    await panel(page).locator('select[name="orden"]').selectOption('precio-asc');

    await expect(page).toHaveURL(/orden=precio-asc/);
    await expect
      .poll(async () => {
        const prices = await page.locator('article').evaluateAll((cards) =>
          cards.map((card) => {
            const match = /(\d+),(\d{2})\s*€/.exec(card.textContent ?? '');
            return match ? Number(match[1]) * 100 + Number(match[2]) : Number.NaN;
          }),
        );
        return prices.length > 1 && prices.every((p, i) => i === 0 || p >= (prices[i - 1] ?? 0));
      })
      .toBe(true);
    const marca = await page.evaluate(
      () => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga,
    );
    expect(marca, 'el documento no se ha recargado').toBe(true);
  });

  test('conserva los chips activos al cambiar el orden', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    await panel(page).locator('select[name="orden"]').selectOption('precio-desc');
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(page).toHaveURL(/orden=precio-desc/);
  });
});

test.describe('CA-04: el precio no se aplica hasta pulsar «Aplicar»', () => {
  test('escribir y salir del campo no cambia la URL; Enter sí la aplica', async ({ page }) => {
    await open(page, '/mujer');
    const max = panel(page).locator('input[name="max"]');
    await max.fill('50');
    await max.blur();
    // No hay evento que esperar: se deja pasar un margen para detectar una navegación indebida.
    await page.waitForTimeout(600);
    expect(page.url()).not.toContain('max=');

    await max.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/max=50/);
  });

  test('el botón «Aplicar filtros» aplica el precio', async ({ page }) => {
    await open(page, '/mujer');
    await panel(page).locator('input[name="min"]').fill('20');
    await panel(page).getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/min=20/);
  });
});

test.describe('CA-07: sin JavaScript el formulario filtra con «Aplicar»', () => {
  test('el listado se ve y el envío GET filtra', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: DESKTOP,
    });
    const page = await context.newPage();
    await page.goto('/mujer');
    await expect(page.locator('article').first()).toBeVisible();
    const before = (await names(page)).length;

    await panel(page).getByText('Blusas', { exact: true }).click();
    // Sin JS el chip no aplica por sí solo: la URL sigue igual hasta pulsar «Aplicar».
    expect(page.url()).not.toContain('categoria=');
    await panel(page).getByRole('button', { name: 'Aplicar filtros' }).click();

    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(page.locator('article').first()).toBeVisible();
    expect((await names(page)).length).toBeLessThan(before);
    await context.close();
  });
});
