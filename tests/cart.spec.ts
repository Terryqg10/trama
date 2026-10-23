import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

// SPEC-001 T-018: carrito de invitado (RF-03, RF-15; CA-05, CA-28, CA-60, CA-61, CA-62).
// Datos del seed `catalog-demo.sql`: «polo-pique-basico» cuesta 29,90 € y cada variante con stock tiene 8.

const FICHA = '/producto/polo-pique-basico?color=negro&talla=M';
const STORAGE_KEY = 'trama.cart.v1';
const WIDTHS = [320, 375, 768, 1280] as const;

async function addPolo(page: Page): Promise<void> {
  await page.goto(FICHA);
  const add = page.getByTestId('add-to-cart');
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByText('Polo piqué básico añadido al carrito.').first()).toBeVisible();
  // Desde T-085 al añadir se abre el carrito lateral: se cierra con Esc para seguir con la ficha.
  await closeCartDrawer(page);
}

async function closeCartDrawer(page: Page): Promise<void> {
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cart-drawer')).toBeHidden();
}

async function savedCart(page: Page): Promise<Array<{ variantId: string; qty: number }>> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
}

async function setSavedCart(page: Page, lines: ReadonlyArray<{ variantId: string; qty: number }>): Promise<void> {
  await page.evaluate(([key, value]) => window.localStorage.setItem(String(key), String(value)), [
    STORAGE_KEY,
    JSON.stringify(lines),
  ]);
}

test.describe('añadir al carrito (CA-60, test cart-add)', () => {
  test('la línea aparece en el carrito con cantidad 1 y una segunda vez suma 1', async ({ page }) => {
    await addPolo(page);
    await page.getByRole('link', { name: 'Ver carrito' }).click();
    await expect(page).toHaveURL(/\/carrito$/);

    await expect(page.getByTestId('cart-line')).toHaveCount(1);
    await expect(page.getByTestId('cart-qty')).toHaveText('1');
    await expect(page.getByTestId('cart-subtotal')).toContainText('29,90');

    await addPolo(page);
    await page.goto('/carrito');
    await expect(page.getByTestId('cart-line')).toHaveCount(1);
    await expect(page.getByTestId('cart-qty')).toHaveText('2');
  });

  test('sin talla elegida el botón no añade nada', async ({ page }) => {
    await page.goto('/producto/polo-pique-basico');
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    expect(await savedCart(page)).toEqual([]);
  });
});

test.describe('persistencia y edición (CA-61, test cart-persist-edit; CA-28)', () => {
  test('recarga, cambio de cantidad y quitar recalculan los totales', async ({ page }) => {
    await addPolo(page);
    await page.goto('/carrito');
    await page.reload();
    await expect(page.getByTestId('cart-line')).toHaveCount(1);

    // 1 × 29,90 € por debajo de 50 €: tarifa plana.
    await expect(page.getByTestId('cart-shipping')).toContainText('4,95');
    await expect(page.getByTestId('cart-total')).toContainText('34,85');
    await expect(page.getByTestId('cart-free-shipping')).toContainText('Te faltan 20,10');

    // 2 × 29,90 € = 59,80 €: envío gratis (CA-28).
    await page.getByRole('button', { name: /Añadir una unidad de/ }).click();
    await expect(page.getByTestId('cart-qty')).toHaveText('2');
    await expect(page.getByTestId('cart-shipping')).toHaveText('Gratis');
    await expect(page.getByTestId('cart-total')).toContainText('59,80');
    await page.reload();
    await expect(page.getByTestId('cart-qty')).toHaveText('2');

    await page.getByRole('button', { name: /Quitar una unidad de/ }).click();
    await expect(page.getByTestId('cart-shipping')).toContainText('4,95');

    await page.getByRole('button', { name: /del carrito/ }).click();
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
    expect(await savedCart(page)).toEqual([]);
  });
});

test.describe('tope por stock (CA-05, test cart-qty-cap)', () => {
  test('una cantidad guardada por encima del stock se ajusta y subir no pasa del stock', async ({ page }) => {
    await addPolo(page);
    const [line] = await savedCart(page);
    expect(line).toBeDefined();
    if (!line) return;
    await setSavedCart(page, [{ variantId: line.variantId, qty: 99 }]);

    await page.goto('/carrito');
    await expect(page.getByTestId('cart-qty')).toHaveText('8');
    await expect(page.getByText('Hemos ajustado la cantidad al stock disponible (8).')).toBeVisible();

    await page.getByRole('button', { name: /Añadir una unidad de/ }).click();
    await expect(page.getByText(/Solo quedan 8 unidades/)).toBeVisible();
    await expect(page.getByTestId('cart-qty')).toHaveText('8');
  });

  test('el botón de la ficha no pasa del stock y lo avisa', async ({ page }) => {
    await page.goto(FICHA);
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    for (let i = 0; i < 9; i += 1) {
      await page.getByTestId('add-to-cart').click();
      // Las 8 primeras abren el carrito lateral (se cierra con Esc); la novena no añade nada y no lo abre.
      if (i < 8) await closeCartDrawer(page);
    }
    await expect(page.getByText('Ya tienes en el carrito todas las unidades disponibles (8).')).toBeVisible();
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    const [line] = await savedCart(page);
    expect(line?.qty).toBe(8);
  });
});

test.describe('líneas no disponibles y carrito manipulado (CA-62)', () => {
  test('una variante inexistente se avisa, no cuenta y se puede quitar', async ({ page }) => {
    await addPolo(page);
    const [real] = await savedCart(page);
    if (!real) throw new Error('No se guardó la línea');
    await setSavedCart(page, [real, { variantId: randomUUID(), qty: 3 }]);

    await page.goto('/carrito');
    await expect(page.getByTestId('cart-line')).toHaveCount(2);
    const missing = page.locator('[data-testid="cart-line"][data-state="missing"]');
    await expect(missing).toContainText('Este artículo ya no está disponible.');
    await expect(page.getByTestId('cart-subtotal')).toContainText('29,90');

    await missing.getByRole('button', { name: /Quitar/ }).click();
    await expect(page.getByTestId('cart-line')).toHaveCount(1);
  });

  test('un carrito guardado con datos inválidos se descarta sin romper la página', async ({ page }) => {
    await page.goto('/carrito');
    await page.evaluate((key) => window.localStorage.setItem(key, '[{"variantId":"x","qty":-4}]'), STORAGE_KEY);
    await page.reload();
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
  });
});

test.describe('interfaz del carrito', () => {
  test('el bloque de envío y devolución también está en el carrito (CA-29)', async ({ page }) => {
    await page.goto('/carrito');
    const block = page.getByRole('region', { name: 'Envío y devolución' });
    await expect(block).toBeVisible();
    await expect(block).toContainText('4,95');
    await expect(block).toContainText('50,00');
    await expect(block).toContainText('30 días');
  });

  for (const width of WIDTHS) {
    test(`con una línea no desborda a ${width}px y los controles miden al menos 44 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await addPolo(page);
      await page.goto('/carrito');
      await expect(page.getByTestId('cart-line')).toHaveCount(1);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `scroll horizontal de ${overflow}px a ${width}px`).toBeLessThanOrEqual(1);

      const controls = page.getByTestId('cart-line').getByRole('button');
      const count = await controls.count();
      expect(count).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < count; i += 1) {
        const box = await controls.nth(i).boundingBox();
        expect(box?.height ?? 0, `botón ${i} a ${width}px`).toBeGreaterThanOrEqual(43.5);
        expect(box?.width ?? 0, `botón ${i} a ${width}px`).toBeGreaterThanOrEqual(43.5);
      }
    });
  }
});
