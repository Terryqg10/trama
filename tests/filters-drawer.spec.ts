import { test, expect, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

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
    await markDocument(page);
    await trigger(page).click();
    await expect(drawer(page)).toBeVisible();
    await page.locator('[data-testid="filters-close"]').click();
    await expect(drawer(page)).toBeHidden();
    await expectNoReload(page);
    expect(page.url()).not.toContain('#');
  });

  test('en escritorio no hay botón ni drawer', async ({ page }) => {
    await open(page, '/mujer', 1280);
    await expect(trigger(page)).toBeHidden();
    await expect(drawer(page)).toBeHidden();
  });
});

test.describe('CA-02 en tablet: por debajo de --bp-lg también hay drawer', () => {
  for (const width of [768, 1023]) {
    test(`a ${width} px el botón abre el drawer y no hay columna lateral`, async ({ page }) => {
      await open(page, '/mujer', width);
      await expect(page.locator('[data-testid="filters-sidebar"]')).toBeHidden();
      await trigger(page).click();
      await expect(drawer(page)).toBeVisible();
      await expect(drawer(page)).toHaveAttribute('aria-modal', 'true');
    });
  }

  test('a 1024 px aparece la columna lateral y desaparece el botón', async ({ page }) => {
    await open(page, '/mujer', 1024);
    await expect(page.locator('[data-testid="filters-sidebar"]')).toBeVisible();
    await expect(trigger(page)).toBeHidden();
  });

  test('«Ordenar por» ya no está en el drawer: vive en la barra sobre el listado (CA-12)', async ({ page }) => {
    await open(page, '/mujer');
    await trigger(page).click();
    await expect(drawer(page).locator('select[name="orden"]')).toHaveCount(0);
    await expect(page.locator('select[name="orden"]')).toHaveCount(1);
  });
});

test.describe('CA-11: entrar con #filtros-movil abre el drawer (con JS)', () => {
  test('abierto, con el foco dentro, sin scroll de fondo; Esc cierra y limpia el hash', async ({
    page,
  }) => {
    await open(page, '/mujer#filtros-movil');
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page)).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('[data-testid="filters-close"]')).toBeFocused();
    expect(await focusInsideDrawer(page)).toBe(true);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    expect(page.url()).not.toContain('#');
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect(trigger(page)).toBeFocused();
  });

  test('el botón de cerrar también cierra y limpia el hash', async ({ page }) => {
    await open(page, '/mujer#filtros-movil');
    await expect(drawer(page)).toBeVisible();
    await page.locator('[data-testid="filters-close"]').click();
    await expect(drawer(page)).toBeHidden();
    expect(page.url()).not.toContain('#');
  });

  test('«Aplicar filtros» desde un drawer abierto por hash lo cierra', async ({ page }) => {
    await open(page, '/mujer#filtros-movil');
    await drawer(page).getByTestId('price-max').fill('45');
    await drawer(page).getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/max=45/);
    await expect(drawer(page)).toBeHidden();
  });

  test('en escritorio el hash no abre nada', async ({ page }) => {
    await open(page, '/mujer#filtros-movil', 1280);
    await expect(drawer(page)).toBeHidden();
    await expect(page.locator('[data-testid="filters-sidebar"]')).toBeVisible();
  });
});

test.describe('pie del drawer: Limpiar a la izquierda y Aplicar a la derecha', () => {
  test('el orden visual coincide con el del DOM y la tabulación', async ({ page }) => {
    // «Limpiar» solo aparece con filtros activos (CA-14).
    await open(page, '/mujer?categoria=blusas');
    await trigger(page).click();
    const clear = drawer(page).getByRole('link', { name: 'Limpiar' });
    const apply = drawer(page).getByRole('button', { name: 'Aplicar filtros' });
    const clearBox = await clear.boundingBox();
    const applyBox = await apply.boundingBox();
    expect(clearBox).not.toBeNull();
    expect(applyBox).not.toBeNull();
    if (clearBox && applyBox) {
      expect(clearBox.x + clearBox.width).toBeLessThanOrEqual(applyBox.x);
      expect(Math.abs(clearBox.y - applyBox.y)).toBeLessThan(2);
    }
    // En el DOM, Limpiar precede a Aplicar: la tabulación sigue el orden visual.
    const domOrder = await drawer(page).evaluate((el) => {
      const link = [...el.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Limpiar');
      const button = [...el.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Aplicar filtros'),
      );
      if (!link || !button) return null;
      return link.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING ? 'ok' : 'mal';
    });
    expect(domOrder).toBe('ok');
  });

  test('en la columna de escritorio se mantiene Aplicar y luego Limpiar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/mujer?categoria=blusas');
    await expect(page.locator('article').first()).toBeVisible();
    const panel = page.locator('[data-testid="filters-panel"]');
    const applyBox = await panel.getByRole('button', { name: 'Aplicar filtros' }).boundingBox();
    const clearBox = await panel.getByRole('link', { name: 'Limpiar' }).boundingBox();
    expect(applyBox).not.toBeNull();
    expect(clearBox).not.toBeNull();
    // La columna es estrecha y los botones pueden envolver: Aplicar va antes en lectura.
    if (applyBox && clearBox) {
      expect(applyBox.y < clearBox.y || applyBox.x < clearBox.x).toBe(true);
    }
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
    await drawer(page).getByTestId('price-max').fill('45');
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
    await open(page, '/mujer?categoria=blusas');
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
