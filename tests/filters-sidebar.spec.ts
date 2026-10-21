import { test, expect, type Page } from '@playwright/test';

// SPEC-002 / T-007: columna lateral de filtros en escritorio (CA-01, CA-05, CA-06, CA-08).

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 812 };

async function open(page: Page, url: string, viewport = DESKTOP): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(url);
  await expect(page.getByRole('status')).toHaveCount(0);
}

test.describe('CA-01: filtros en columna lateral izquierda (escritorio)', () => {
  test('la columna está visible, a la izquierda del listado, y no hay panel superior', async ({
    page,
  }) => {
    await open(page, '/mujer');
    const sidebar = page.locator('[data-testid="filters-sidebar"]');
    await expect(sidebar).toBeVisible();
    await expect(page.locator('[data-testid="filters-panel-top"]')).toHaveCount(0);

    const sidebarBox = await sidebar.boundingBox();
    const firstCard = await page.locator('article').first().boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(firstCard).not.toBeNull();
    if (sidebarBox && firstCard) {
      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(firstCard.x);
    }
  });

  test('la columna se queda fija al hacer scroll', async ({ page }) => {
    await open(page, '/mujer');
    await expect(page.locator('article').first()).toBeVisible();
    const sidebar = page.locator('[data-testid="filters-sidebar"]');
    const before = await sidebar.boundingBox();
    // Un desplazamiento moderado: más allá del final del listado la columna sale con él.
    await page.evaluate(() => window.scrollTo(0, 250));
    const after = await sidebar.boundingBox();
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    if (before && after) {
      expect(before.y).toBeGreaterThan(100);
      expect(after.y).toBeGreaterThanOrEqual(0);
      expect(after.y).toBeLessThan(40);
    }
  });

  test('en móvil la columna no se muestra y sí el botón «Filtros»', async ({ page }) => {
    await open(page, '/mujer', MOBILE);
    await expect(page.locator('[data-testid="filters-sidebar"]')).toBeHidden();
    await expect(page.locator('[data-testid="filters-open"]')).toBeVisible();
  });
});

test.describe('CA-05: contador de filtros activos', () => {
  test('con 2 filtros activos la cabecera del panel muestra «2 activos»', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&ocasion=vestir');
    await expect(page.locator('[data-testid="filters-count"]')).toContainText('2');
    await expect(page.locator('[data-testid="filters-count"]')).toHaveText('2 activos');
  });

  test('sin filtros no se muestra contador', async ({ page }) => {
    await open(page, '/mujer');
    await expect(page.locator('[data-testid="filters-count"]')).toHaveCount(0);
  });
});

test.describe('CA-06: Limpiar conserva el orden', () => {
  test('quita los filtros y deja solo orden en la URL', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&ocasion=vestir&orden=precio-asc');
    await page.locator('[data-testid="filters-panel"]').getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer\?orden=precio-asc$/);
    await expect(page.locator('[data-testid="filters-count"]')).toHaveCount(0);
  });

  test('con el orden por defecto la URL queda sin parámetros', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    await page.locator('[data-testid="filters-panel"]').getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer$/);
  });
});

test.describe('CA-08: el panel está visible por defecto en escritorio', () => {
  test('no está plegado ni dentro de un <details>', async ({ page }) => {
    await open(page, '/mujer');
    await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
    await expect(page.locator('details [data-testid="filters-panel"]')).toHaveCount(0);
    // Enmienda 4 (T-074): dentro del panel hay secciones plegables (<details>), abiertas por defecto; fuera de él, ninguna.
    await expect(page.locator('details:visible:not([open])')).toHaveCount(0);
    await expect(page.locator('details:visible')).toHaveCount(4);
    await expect(page.locator('[data-testid="filters-panel"] details:visible')).toHaveCount(4);
  });
});
