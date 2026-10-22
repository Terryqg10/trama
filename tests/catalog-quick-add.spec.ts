import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-121 (T-081, Enmienda 34 de SPEC-001): colores, tallas y «Añadir a la cesta» debajo de la foto, siempre visibles desde
// 768 px. Depende del seed: el abrigo de paño gris (1 color; S, M, L y XL con stock) y el polo piqué básico (3 colores).

const COAT = 'Abrigo de paño gris';
const POLO = 'Polo piqué básico';
const CART_KEY = 'trama.cart.v1';

async function open(page: Page, path = '/hombre', width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator('article').first()).toBeVisible();
}

const card = (page: Page, name: string): Locator =>
  page.locator('article', { has: page.getByRole('heading', { name, exact: true }) });
const controls = (page: Page, name: string): Locator => card(page, name).getByTestId('quick-add');
const savedCart = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as { variantId: string; qty: number }[], CART_KEY);

test.describe('estructura bajo la foto (CA-121)', () => {
  test('siempre visibles, sin hover ni foco, y fuera de la imagen: debajo del nombre y del precio', async ({ page }) => {
    await open(page);
    await page.mouse.move(2, 2);
    const target = card(page, COAT);
    await target.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect(controls(page, COAT)).toBeVisible();
    await expect(controls(page, COAT)).toHaveCSS('opacity', '1');
    const media = await target.locator('div.relative.aspect-3\\/4').boundingBox();
    const heading = await target.getByRole('heading', { name: COAT }).boundingBox();
    const price = await target.getByTestId('card-price').boundingBox();
    const block = await controls(page, COAT).boundingBox();
    expect(media && heading && price && block).toBeTruthy();
    if (!media || !heading || !price || !block) return;
    expect(heading.y).toBeGreaterThanOrEqual(media.y + media.height - 1);
    expect(block.y).toBeGreaterThanOrEqual(price.y + price.height - 1);
    // Nada de panel superpuesto: los controles no están dentro de la imagen.
    expect(await target.locator('div.relative.aspect-3\\/4 [data-testid="quick-add"]').count()).toBe(0);
    expect(await controls(page, COAT).evaluate((el) => getComputedStyle(el).position)).not.toBe('absolute');
  });

  test('pasar el cursor por la foto no tapa nada ni mueve los controles', async ({ page }) => {
    await open(page);
    const target = card(page, COAT);
    await target.scrollIntoViewIfNeeded();
    const before = await controls(page, COAT).boundingBox();
    const image = await target.locator('img').first().boundingBox();
    await page.mouse.move((image?.x ?? 0) + (image?.width ?? 0) / 2, (image?.y ?? 0) + (image?.height ?? 0) - 20);
    await page.waitForTimeout(400);
    const after = await controls(page, COAT).boundingBox();
    expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
    // El pie de la imagen sigue siendo la foto: no hay ningún botón encima.
    const hit = await page.evaluate(
      ({ x, y }) => document.elementsFromPoint(x, y).some((el) => el.closest('[data-testid="quick-add"]') !== null),
      { x: (image?.x ?? 0) + (image?.width ?? 0) / 2, y: (image?.y ?? 0) + (image?.height ?? 0) - 20 },
    );
    expect(hit).toBe(false);
  });

  test('orden: imagen, nombre, precio, miniaturas de color, tallas y botón', async ({ page }) => {
    await open(page);
    const target = card(page, POLO);
    await target.scrollIntoViewIfNeeded();
    const ys = await Promise.all([
      target.locator('div.relative.aspect-3\\/4').boundingBox(),
      target.getByRole('heading', { name: POLO }).boundingBox(),
      target.getByTestId('card-price').boundingBox(),
      target.getByRole('group', { name: `Color de ${POLO}` }).boundingBox(),
      target.getByRole('group', { name: `Talla de ${POLO}` }).boundingBox(),
      target.getByTestId('quick-add-button').boundingBox(),
    ]);
    const tops = ys.map((box) => box?.y ?? Number.NaN);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(6);
  });

  test('una prenda de un solo color no lleva miniaturas; las tallas son botones cuadrados de 44 px', async ({ page }) => {
    await open(page);
    await expect(controls(page, COAT).getByTestId('quick-add-color')).toHaveCount(0);
    const sizes = controls(page, COAT).getByTestId('quick-add-size');
    await expect(sizes).toHaveText(['S', 'M', 'L', 'XL']);
    for (let i = 0; i < 4; i++) {
      const box = await sizes.nth(i).boundingBox();
      expect(Math.round(box?.width ?? 0)).toBe(44);
      expect(Math.round(box?.height ?? 0)).toBe(44);
      expect(await sizes.nth(i).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
    }
  });

  test('el botón ocupa todo el ancho, dice «Elige talla» y está desactivado hasta elegir', async ({ page }) => {
    await open(page);
    const button = controls(page, COAT).getByTestId('quick-add-button');
    await expect(button).toHaveText('Elige talla');
    await expect(button).toBeDisabled();
    const block = await controls(page, COAT).boundingBox();
    const box = await button.boundingBox();
    expect(Math.abs((box?.width ?? 0) - (block?.width ?? 0))).toBeLessThanOrEqual(1);
    await controls(page, COAT).getByTestId('quick-add-size').nth(1).click();
    await expect(button).toHaveText('Añadir a la cesta');
    await expect(button).toBeEnabled();
    expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('las tarjetas de una misma fila alinean sus controles abajo', async ({ page }) => {
    await open(page);
    const bottoms = await page.locator('article').evaluateAll((cards) =>
      cards.slice(0, 3).map((c) => {
        const r = c.querySelector('[data-testid="quick-add"]')?.getBoundingClientRect();
        return r ? Math.round(r.bottom) : -1;
      }),
    );
    expect(bottoms.every((b) => b > 0)).toBe(true);
    expect(new Set(bottoms).size).toBe(1);
  });
});

test.describe('colores (CA-121)', () => {
  test('el polo tiene una miniatura por color (≥ 44 px, aria-pressed); la inicial, con borde de acento', async ({ page }) => {
    await open(page);
    const thumbs = controls(page, POLO).getByTestId('quick-add-color');
    await expect(thumbs).toHaveCount(3);
    await expect(card(page, POLO)).toContainText('3 colores');
    for (let i = 0; i < 3; i++) {
      const box = await thumbs.nth(i).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      const dot = await thumbs.nth(i).locator('span').boundingBox();
      expect(Math.round(dot?.width ?? 0)).toBe(24);
    }
    await expect(thumbs.filter({ has: page.locator('[aria-pressed="true"]') })).toHaveCount(0);
    const pressed = await thumbs.evaluateAll((items) => items.map((i) => i.getAttribute('aria-pressed')));
    expect(pressed.filter((v) => v === 'true')).toHaveLength(1);
    const active = controls(page, POLO).locator('[data-testid="quick-add-color"][aria-pressed="true"] span');
    expect(await active.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
  });

  test('elegir un color cambia la imagen principal y las tallas, marca la miniatura y borra la talla elegida', async ({ page }) => {
    await open(page);
    const target = card(page, POLO);
    await target.scrollIntoViewIfNeeded();
    const thumbs = controls(page, POLO).getByTestId('quick-add-color');
    const sizes = controls(page, POLO).getByTestId('quick-add-size');
    await sizes.first().click();
    await expect(controls(page, POLO).getByTestId('quick-add-button')).toHaveText('Añadir a la cesta');
    const labels = await thumbs.evaluateAll((items) => items.map((i) => i.getAttribute('aria-label') ?? ''));
    const initialAlt = await target.getByTestId('card-image').getAttribute('alt');
    const other = await thumbs.evaluateAll((items) => items.findIndex((i) => i.getAttribute('aria-pressed') === 'false'));
    await thumbs.nth(other).click();
    await expect(thumbs.nth(other)).toHaveAttribute('aria-pressed', 'true');
    const color = (labels[other] ?? '').replace('Color ', '').toLowerCase();
    await expect(target.getByTestId('card-image')).toHaveAttribute('alt', new RegExp(`color ${color}$`, 'i'));
    expect(await target.getByTestId('card-image').getAttribute('alt')).not.toBe(initialAlt);
    // Sin talla elegida otra vez.
    await expect(controls(page, POLO).getByTestId('quick-add-button')).toHaveText('Elige talla');
    await expect(controls(page, POLO).getByTestId('quick-add-button')).toBeDisabled();
    await expect(sizes.locator('xpath=self::*[@aria-pressed="true"]')).toHaveCount(0);
    // Las tallas son las de ese color: se ven y se pueden elegir.
    expect(await sizes.count()).toBeGreaterThan(0);
  });

  test('cada color añade su propia variante al carrito', async ({ page }) => {
    await open(page);
    const thumbs = controls(page, POLO).getByTestId('quick-add-color');
    const sizes = controls(page, POLO).getByTestId('quick-add-size');
    const add = controls(page, POLO).getByTestId('quick-add-button');
    await card(page, POLO).scrollIntoViewIfNeeded();
    await sizes.first().click();
    await add.click();
    await expect(controls(page, POLO).getByText('añadido al carrito.')).toBeVisible();
    const other = await thumbs.evaluateAll((items) => items.findIndex((i) => i.getAttribute('aria-pressed') === 'false'));
    await thumbs.nth(other).click();
    await sizes.first().click();
    await add.click();
    await expect.poll(async () => (await savedCart(page)).length).toBe(2);
    const cart = await savedCart(page);
    expect(new Set(cart.map((line) => line.variantId)).size).toBe(2);
  });
});

test.describe('compra y navegación (CA-121)', () => {
  test('elegir talla y pulsar «Añadir a la cesta» añade esa variante, con aviso aria-live; sumar otra unidad; el carrito la muestra', async ({ page }) => {
    await open(page);
    await card(page, COAT).scrollIntoViewIfNeeded();
    expect(await savedCart(page)).toEqual([]);
    await controls(page, COAT).getByTestId('quick-add-size').nth(2).click();
    await controls(page, COAT).getByTestId('quick-add-button').click();
    await expect(controls(page, COAT).getByText('Abrigo de paño gris añadido al carrito.')).toBeVisible();
    await expect(controls(page, COAT).locator('[aria-live="polite"]')).toHaveCount(1);
    await expect(controls(page, COAT).getByRole('link', { name: 'Ver carrito' })).toHaveAttribute('href', '/carrito');
    const cart = await savedCart(page);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.qty).toBe(1);
    await controls(page, COAT).getByTestId('quick-add-button').click();
    expect((await savedCart(page))[0]?.qty).toBe(2);
    await page.goto('/carrito');
    await expect(page.getByText('Abrigo de paño gris').first()).toBeVisible();
  });

  test('pulsar un control no navega; pulsar la foto o el nombre lleva a la ficha', async ({ page }) => {
    await open(page);
    await card(page, COAT).scrollIntoViewIfNeeded();
    await controls(page, COAT).getByTestId('quick-add-size').first().click();
    await expect(page).toHaveURL(/\/hombre$/);
    const image = await card(page, COAT).locator('img').first().boundingBox();
    await page.mouse.click((image?.x ?? 0) + (image?.width ?? 0) / 2, (image?.y ?? 0) + 60);
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
    await page.goBack();
    await card(page, COAT).getByRole('link', { name: COAT }).click();
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });

  test('se maneja con teclado: color, talla y botón con Intro', async ({ page }) => {
    await open(page);
    await card(page, POLO).scrollIntoViewIfNeeded();
    const thumbs = controls(page, POLO).getByTestId('quick-add-color');
    await thumbs.nth(1).focus();
    expect(await thumbs.nth(1).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await controls(page, POLO).getByTestId('quick-add-size').first().focus();
    await page.keyboard.press('Enter');
    await controls(page, POLO).getByTestId('quick-add-button').focus();
    await page.keyboard.press('Enter');
    await expect(controls(page, POLO).getByText('añadido al carrito.')).toBeVisible();
    expect(await savedCart(page)).toHaveLength(1);
  });
});

test.describe('anchos y otras páginas (CA-121)', () => {
  test('desde 768 px se ven los controles; a 767, 375 y 320 px no existen', async ({ page }) => {
    await open(page, '/hombre', 768);
    await expect(controls(page, COAT)).toBeVisible();
    for (const width of [767, 375, 320]) {
      await open(page, '/hombre', width);
      expect(await controls(page, COAT).evaluate((el) => getComputedStyle(el).display), `${width} px`).toBe('none');
    }
  });

  test('a 375 px la tarjeta solo tiene foto, nombre y precio, y tocarla lleva a la ficha', async ({ page }) => {
    await open(page, '/hombre', 375);
    await expect(controls(page, COAT).getByTestId('quick-add-size').first()).toBeHidden();
    await card(page, COAT).getByRole('link', { name: COAT }).click();
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });

  test('en la portada y en la búsqueda las tarjetas no llevan controles', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('quick-add')).toHaveCount(0);
    await page.goto('/buscar?q=abrigo');
    await expect(page.locator('article').first()).toBeVisible();
    await expect(page.getByTestId('quick-add')).toHaveCount(0);
  });

  for (const width of [320, 375, 768, 1024, 1280]) {
    test(`sin scroll horizontal ni tarjetas cortadas a ${width} px`, async ({ page }) => {
      await open(page, '/hombre', width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const target = card(page, POLO);
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
      if (width >= 768) {
        const inner = await controls(page, POLO).boundingBox();
        expect((inner?.x ?? 0) + (inner?.width ?? 0)).toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0) + 0.5);
        // Las miniaturas y las tallas no se salen de la tarjeta aunque envuelvan.
        const items = await controls(page, POLO).locator('button').evaluateAll((buttons) =>
          buttons.map((b) => Math.round(b.getBoundingClientRect().right)),
        );
        for (const right of items) expect(right).toBeLessThanOrEqual(Math.round((box?.x ?? 0) + (box?.width ?? 0)));
      }
    });
  }

  test('axe sin violaciones graves en una tarjeta con colores', async ({ page }) => {
    await open(page);
    await card(page, POLO).scrollIntoViewIfNeeded();
    await controls(page, POLO).getByTestId('quick-add-size').first().click();
    const results = await new AxeBuilder({ page }).include('article:has([data-testid="quick-add-color"])').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
