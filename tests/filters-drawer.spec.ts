import { test, expect, type Page } from '@playwright/test';

// SPEC-002 / T-009: drawer de filtros a pantalla completa en móvil (CA-02, RF-02, RF-05).

const MOBILE = { width: 375, height: 812 };

const trigger = (page: Page) => page.locator('[data-testid="filters-open"]');
const drawer = (page: Page) => page.locator('[data-testid="filters-drawer"]');

async function open(page: Page, url: string, width = MOBILE.width): Promise<void> {
  await page.setViewportSize({ width, height: MOBILE.height });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

async function focusInsideDrawer(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const dialog = document.querySelector('[data-testid="filters-drawer"]');
    return dialog?.contains(document.activeElement) ?? false;
  });
}

test.describe('CA-02: el botón «Filtros» abre un drawer a pantalla completa', () => {
  test('se abre como diálogo modal que ocupa todo el viewport', async ({ page }) => {
    await open(page, '/mujer');
    await expect(drawer(page)).toBeHidden();
    await trigger(page).click();

    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page)).toHaveAttribute('aria-modal', 'true');
    await expect(drawer(page)).toHaveAttribute('role', 'dialog');
    await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible();

    const box = await drawer(page).boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.width).toBe(MOBILE.width);
      expect(box.height).toBe(MOBILE.height);
    }
  });

  test('no recarga el documento al abrir ni cerrar', async ({ page }) => {
    await open(page, '/mujer');
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga?: boolean }).__sinRecarga = true;
    });
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();
    await page.locator('[data-testid="filters-close"]').click();
    await expect(drawer(page)).toBeHidden();
    const marca = await page.evaluate(
      () => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga,
    );
    expect(marca).toBe(true);
    expect(page.url()).not.toContain('#');
  });

  test('en escritorio no hay botón ni drawer', async ({ page }) => {
    await open(page, '/mujer', 1280);
    await expect(trigger(page)).toBeHidden();
    await expect(drawer(page)).toBeHidden();
  });
});

test.describe('cierre, foco y teclado', () => {
  test('Esc cierra el drawer y el foco vuelve al botón «Filtros»', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('el botón de cerrar es visible, mide ≥ 44 px y devuelve el foco', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    const close = page.locator('[data-testid="filters-close"]');
    await expect(close).toBeFocused();
    const box = await close.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(drawer(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('el foco queda atrapado dentro del drawer', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      expect(await focusInsideDrawer(page), `tabulación ${i + 1} fuera del drawer`).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusInsideDrawer(page), `Mayús+Tab ${i + 1} fuera del drawer`).toBe(true);
    }
  });

  test('con el drawer abierto no se desplaza la página de fondo', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
});

test.describe('contenido del drawer (RF-05 y T-008)', () => {
  test('el contador aparece junto al botón y en la cabecera del drawer', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&ocasion=vestir');
    await expect(page.locator('[data-testid="filters-count-mobile"]')).toHaveText('2 activos');
    await trigger(page).click();
    await expect(page.locator('[data-testid="filters-count-drawer"]')).toHaveText('2 activos');
  });

  test('un chip se aplica al clic y el drawer sigue abierto', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await drawer(page).getByText('Blusas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).getByRole('radio', { name: 'Blusas' })).toBeChecked();
  });

  test('«Aplicar filtros» aplica el precio y cierra el drawer', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await drawer(page).locator('input[name="max"]').fill('45');
    await drawer(page).getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/max=45/);
    await expect(drawer(page)).toBeHidden();
  });

  test('«Limpiar» quita los filtros y cierra el drawer', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&orden=precio-asc');
    await trigger(page).click();
    await drawer(page).getByRole('link', { name: 'Limpiar' }).click();
    await expect(page).toHaveURL(/\/mujer\?orden=precio-asc$/);
    await expect(drawer(page)).toBeHidden();
  });

  test('«Aplicar filtros» y «Limpiar» quedan visibles sin desplazar', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await expect(drawer(page).getByRole('button', { name: 'Aplicar filtros' })).toBeInViewport();
    await expect(drawer(page).getByRole('link', { name: 'Limpiar' })).toBeInViewport();
  });

  test('los controles del drawer miden al menos 44 px', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    const controls = drawer(page).locator(
      'button:visible, select:visible, input[type="number"]:visible, a:visible',
    );
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box?.height ?? 0, `control ${i}`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('sin desbordamiento horizontal con el drawer', () => {
  for (const width of [320, 375, 768]) {
    test(`a ${width} px`, async ({ page }) => {
      await open(page, '/mujer?categoria=blusas', width);
      await trigger(page).click();
      await expect(drawer(page)).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});

test.describe('sin JavaScript el botón sigue dando acceso al formulario', () => {
  test('el enlace abre el panel con :target y el envío GET filtra', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: MOBILE,
    });
    const page = await context.newPage();
    await page.goto('/mujer');
    await expect(drawer(page)).toBeHidden();
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();

    await drawer(page).getByText('Blusas', { exact: true }).click();
    await drawer(page).getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await context.close();
  });
});
