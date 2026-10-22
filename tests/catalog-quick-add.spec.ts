import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-120 (T-077, Enmiendas 32 y 33): panel de compra rápida al pasar el cursor sobre la tarjeta del catálogo.
// Depende del seed de otoño (`catalog-autumn.sql`): el abrigo de paño gris tiene S, M, L y XL con stock.

const NAME = 'Abrigo de paño gris';
const CART_KEY = 'trama.cart.v1';

async function open(page: Page, path = '/hombre', width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator('article').first()).toBeVisible();
}

const card = (page: Page, name = NAME): Locator =>
  page.locator('article', { has: page.getByRole('heading', { name, exact: true }) });
const panel = (page: Page, name = NAME): Locator => card(page, name).getByTestId('quick-add');

async function hoverImage(page: Page, name = NAME): Promise<void> {
  const target = card(page, name);
  await target.scrollIntoViewIfNeeded();
  const image = await target.locator('img').first().boundingBox();
  if (!image) throw new Error('tarjeta sin imagen');
  await page.mouse.move(image.x + image.width / 2, image.y + 40);
}

const savedCart = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as { variantId: string; qty: number }[], CART_KEY);

test.describe('panel al pasar el cursor (CA-120)', () => {
  test('sin hover ni foco está oculto y no recibe pulsaciones; con hover se ve', async ({ page }) => {
    await open(page);
    await page.mouse.move(2, 2);
    const target = panel(page);
    await target.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect(target).toHaveCSS('opacity', '0');
    await expect(target).toHaveCSS('pointer-events', 'none');
    await hoverImage(page);
    await expect(target).toHaveCSS('opacity', '1');
    await expect(target).toHaveCSS('pointer-events', 'auto');
  });

  test('tiene las tallas del primer color con stock en 4 columnas y el botón «Añadir a la cesta» desactivado hasta elegir talla', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    const sizes = panel(page).getByTestId('quick-add-size');
    await expect(sizes).toHaveText(['S', 'M', 'L', 'XL']);
    const tops = await sizes.evaluateAll((items) => items.map((i) => Math.round(i.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'una sola fila de 4').toBe(1);
    await expect(panel(page).getByTestId('quick-add-button')).toHaveText('Añadir a la cesta');
    await expect(panel(page).getByTestId('quick-add-button')).toBeDisabled();
    await sizes.nth(1).click();
    await expect(sizes.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(sizes.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(panel(page).getByTestId('quick-add-button')).toBeEnabled();
  });

  test('elegir talla y pulsar el botón añade esa variante al carrito, con aviso', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    expect(await savedCart(page)).toEqual([]);
    await panel(page).getByTestId('quick-add-size').nth(2).click();
    await panel(page).getByTestId('quick-add-button').click();
    await expect(panel(page).getByText('Abrigo de paño gris añadido al carrito.')).toBeVisible();
    await expect(panel(page).getByRole('link', { name: 'Ver carrito' })).toHaveAttribute('href', '/carrito');
    const cart = await savedCart(page);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.qty).toBe(1);
    await panel(page).getByTestId('quick-add-button').click();
    expect((await savedCart(page))[0]?.qty).toBe(2);
    // El carrito muestra la prenda.
    await page.goto('/carrito');
    await expect(page.getByText('Abrigo de paño gris').first()).toBeVisible();
  });

  test('el aviso es una región aria-live', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    await expect(panel(page).locator('[aria-live="polite"]')).toHaveCount(1);
  });

  test('pulsar fuera de los botones sigue llevando a la ficha', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    const image = await card(page).locator('img').first().boundingBox();
    await page.mouse.click((image?.x ?? 0) + (image?.width ?? 0) / 2, (image?.y ?? 0) + 40);
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });

  test('pulsar el hueco del panel entre los botones también lleva a la ficha, y el nombre sigue siendo un enlace', async ({ page }) => {
    await open(page);
    await expect(card(page).getByRole('link', { name: NAME })).toHaveAttribute('href', '/producto/abrigo-pano-gris');
    await card(page).getByRole('link', { name: NAME }).click();
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });

  test('las tallas y el botón miden al menos 44 px y tienen nombre accesible', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    const sizes = panel(page).getByTestId('quick-add-size');
    for (let i = 0; i < 4; i++) {
      expect((await sizes.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(sizes.first()).toHaveAttribute('aria-label', 'Talla S');
    expect((await panel(page).getByTestId('quick-add-button').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(panel(page).getByRole('group', { name: 'Talla de Abrigo de paño gris' })).toBeVisible();
  });

  test('el panel va dentro de la imagen, pegado abajo, con el estilo del encargo', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    const image = await card(page).locator('div.relative.overflow-hidden').first().boundingBox();
    const box = await panel(page).boundingBox();
    expect(box && image).toBeTruthy();
    if (!box || !image) return;
    expect(box.x).toBeGreaterThanOrEqual(image.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(image.x + image.width + 1);
    expect(box.y + box.height).toBeCloseTo(image.y + image.height, 0);
    const style = await panel(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return { backdrop: s.backdropFilter, bg: s.backgroundColor };
    });
    expect(style.backdrop).toContain('blur');
  });
});

test.describe('teclado, movimiento y umbral (CA-120)', () => {
  test('con teclado el panel aparece con el foco; Esc lo oculta y devuelve el foco al enlace', async ({ page }) => {
    await open(page);
    await page.mouse.move(2, 2);
    const size = panel(page).getByTestId('quick-add-size').first();
    await size.focus();
    await expect(panel(page)).toHaveCSS('opacity', '1');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCSS('opacity', '0');
    await expect(card(page).getByRole('link', { name: NAME })).toBeFocused();
    // Al salir del foco de la tarjeta vuelve a poder verse.
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    await size.focus();
    await expect(panel(page)).toHaveCSS('opacity', '1');
  });

  test('se elige talla y se añade solo con teclado', async ({ page }) => {
    await open(page);
    await page.mouse.move(2, 2);
    await panel(page).getByTestId('quick-add-size').nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(panel(page).getByTestId('quick-add-size').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(panel(page).getByTestId('quick-add-size').nth(2)).toBeFocused();
    await panel(page).getByTestId('quick-add-button').focus();
    await page.keyboard.press('Enter');
    await expect(panel(page).getByText('añadido al carrito.')).toBeVisible();
    expect(await savedCart(page)).toHaveLength(1);
  });

  test.describe('con prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('el panel aparece sin transición', async ({ page }) => {
      await open(page);
      expect(await panel(page).evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    });
  });

  test('con movimiento permitido el panel se desvanece en 300 ms', async ({ page }) => {
    await open(page);
    expect(await panel(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.3s');
  });

  test('desde 768 px existe y a 767 px y en móvil no', async ({ page }) => {
    await open(page, '/hombre', 768);
    expect(await panel(page).evaluate((el) => getComputedStyle(el).display)).toBe('block');
    for (const width of [767, 375, 320]) {
      await open(page, '/hombre', width);
      expect(await panel(page).evaluate((el) => getComputedStyle(el).display), `${width} px`).toBe('none');
      await expect(panel(page).getByTestId('quick-add-size').first()).toBeHidden();
    }
  });

  test('a 375 px tocar la tarjeta lleva a la ficha', async ({ page }) => {
    await open(page, '/hombre', 375);
    await card(page).getByRole('link', { name: NAME }).click();
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });

  test('en la portada y en la búsqueda las tarjetas no llevan el panel', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('quick-add')).toHaveCount(0);
    await page.goto('/buscar?q=abrigo');
    await expect(page.locator('article').first()).toBeVisible();
    await expect(page.getByTestId('quick-add')).toHaveCount(0);
  });

  test('sin scroll horizontal a 768, 1024 y 1280 px con el panel visible', async ({ page }) => {
    for (const width of [768, 1024, 1280]) {
      await open(page, '/hombre', width);
      await hoverImage(page);
      await expect(panel(page)).toHaveCSS('opacity', '1');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width} px`).toBeLessThanOrEqual(1);
      const box = await panel(page).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
    }
  });

  test('axe sin violaciones graves con el panel visible', async ({ page }) => {
    await open(page);
    await hoverImage(page);
    await expect(panel(page)).toHaveCSS('opacity', '1');
    const results = await new AxeBuilder({ page }).include('article:has([data-testid="quick-add"]):nth-of-type(1)').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
