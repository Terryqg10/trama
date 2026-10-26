import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-122 (T-082, Enmiendas 35 y 36 de SPEC-001): tarjeta limpia con círculos de color; tallas y «Añadir a la cesta» en un panel
// que sube desde el borde inferior de la foto, dentro de ella, al pasar el cursor (desde 768 px). Depende del seed: el abrigo de paño gris (1 color; S, M, L
// y XL con stock) y el polo piqué básico (3 colores).

const COAT = 'Abrigo de paño gris';
const POLO = 'Polo piqué básico';
const CART_KEY = 'trama.cart.v1';

// El panel es de escritorio (hover desde 768 px): se prueba con ratón y sin emulación táctil, también en el proyecto mobile.
test.use({ hasTouch: false, isMobile: false });

async function open(page: Page, path = '/hombre', width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator('article').first()).toBeVisible();
}

const card = (page: Page, name: string): Locator =>
  page.locator('article', { has: page.getByRole('heading', { name, exact: true }) });
const panel = (page: Page, name: string): Locator => card(page, name).getByTestId('quick-add');
const savedCart = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as { variantId: string; qty: number }[], CART_KEY);

/** Pone el cursor sobre la foto de la tarjeta. */
async function hoverPhoto(page: Page, name: string): Promise<void> {
  const target = card(page, name);
  await target.scrollIntoViewIfNeeded();
  const image = await target.locator('img').first().boundingBox();
  if (!image) throw new Error('tarjeta sin imagen');
  await page.mouse.move(image.x + image.width / 2, image.y + 60);
}

test.describe('estado normal limpio (CA-122)', () => {
  test('sin hover no hay tallas ni botón a la vista: el panel está oculto y no recibe pulsaciones', async ({ page }) => {
    await open(page);
    await card(page, COAT).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect(panel(page, COAT)).toHaveCSS('opacity', '0');
    await expect(panel(page, COAT)).toHaveCSS('pointer-events', 'none');
    await expect(card(page, COAT).getByTestId('quick-add-size').first()).toHaveCSS('opacity', '1');
    expect(await panel(page, COAT).evaluate((el) => getComputedStyle(el).position)).toBe('absolute');
  });

  test('una prenda de un solo color lleva un círculo de 20 px alineado a la izquierda; no hay texto «1 color» a la vista', async ({ page }) => {
    await open(page);
    const dots = card(page, COAT).getByTestId('card-colors');
    await expect(dots).toBeVisible();
    const circles = dots.locator('span');
    await expect(circles).toHaveCount(1);
    const box = await circles.first().boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(20);
    expect(Math.round(box?.height ?? 0)).toBe(20);
    expect(await circles.first().evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px');
    // Alineado con el borde izquierdo del texto.
    const heading = await card(page, COAT).getByRole('heading', { name: COAT }).boundingBox();
    expect(Math.abs((box?.x ?? 0) - (heading?.x ?? 0))).toBeLessThanOrEqual(2);
    const text = await card(page, COAT).getByText('1 color', { exact: true }).boundingBox();
    expect((text?.width ?? 0) * (text?.height ?? 0)).toBeLessThanOrEqual(4);
  });

  test('con varios colores, desde 768 px los círculos son botones de 44 px con círculo de 20 px, alineados a la izquierda, y el elegido lleva anillo', async ({ page }) => {
    await open(page);
    const target = card(page, POLO);
    await target.scrollIntoViewIfNeeded();
    await expect(target.getByTestId('card-colors')).toBeHidden();
    const dots = target.getByTestId('quick-add-color');
    await expect(dots).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const box = await dots.nth(i).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(Math.round((await dots.nth(i).locator('span').boundingBox())?.width ?? 0)).toBe(20);
    }
    const first = await dots.first().locator('span').boundingBox();
    const heading = await target.getByRole('heading', { name: POLO }).boundingBox();
    expect(Math.abs((first?.x ?? 0) - (heading?.x ?? 0))).toBeLessThanOrEqual(2);
    const pressed = await dots.evaluateAll((items) => items.map((i) => i.getAttribute('aria-pressed')));
    expect(pressed.filter((v) => v === 'true')).toHaveLength(1);
    const ring = target.locator('[data-testid="quick-add-color"][aria-pressed="true"] span');
    expect(await ring.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    const plain = target.locator('[data-testid="quick-add-color"][aria-pressed="false"] span').first();
    expect(await plain.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
  });

  test('orden: foto, nombre, círculos y precio, sin tallas ni botón entre medias', async ({ page }) => {
    await open(page);
    const target = card(page, POLO);
    await target.scrollIntoViewIfNeeded();
    const tops = await Promise.all([
      target.locator('div.relative.aspect-3\\/4').boundingBox(),
      target.getByRole('heading', { name: POLO }).boundingBox(),
      target.getByTestId('color-dots').boundingBox(),
      target.getByTestId('card-price').boundingBox(),
    ]).then((boxes) => boxes.map((box) => box?.y ?? Number.NaN));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(4);
  });

  test('la tarjeta y el contenedor de la foto recortan su contenido (la foto con overflow: clip, sin scroll programático)', async ({ page }) => {
    await open(page);
    expect(await card(page, COAT).evaluate((el) => getComputedStyle(el).overflow)).toBe('hidden');
    const media = card(page, COAT).locator('div.relative.aspect-3\\/4');
    expect(await media.evaluate((el) => getComputedStyle(el).overflow)).toBe('clip');
  });
});

test.describe('panel al pasar el cursor (CA-122)', () => {
  test('con hover aparece dentro de la foto, pegado a su borde inferior, sin salirse de ella', async ({ page }) => {
    await open(page);
    await hoverPhoto(page, COAT);
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    await expect(panel(page, COAT)).toHaveCSS('pointer-events', 'auto');
    const image = await card(page, COAT).locator('div.relative.aspect-3\\/4').boundingBox();
    const box = await panel(page, COAT).boundingBox();
    expect(image && box).toBeTruthy();
    if (!image || !box) return;
    await expect.poll(async () => Math.round((await panel(page, COAT).boundingBox())?.y ?? 0)).toBe(Math.round(box.y));
    expect(Math.abs(box.x - image.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.x + box.width - (image.x + image.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height - (image.y + image.height))).toBeLessThanOrEqual(1);
    expect(box.y).toBeGreaterThan(image.y);
    // Cubre solo la parte baja de la foto.
    expect(box.height).toBeLessThan(image.height * 0.6);
    const style = await panel(page, COAT).evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(style).toContain('blur');
  });

  test('al pasar el cursor no se mueve nada: el texto sigue en su sitio y la tarjeta no cambia de tamaño ni invade a las vecinas', async ({ page }) => {
    await open(page);
    const target = card(page, COAT);
    await target.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const measure = async () => ({
      article: await target.boundingBox(),
      heading: await target.getByRole('heading', { name: COAT }).boundingBox(),
      dots: await target.getByTestId('card-colors').boundingBox(),
      price: await target.getByTestId('card-price').boundingBox(),
      next: await card(page, POLO).boundingBox(),
    });
    const before = await measure();
    await hoverPhoto(page, COAT);
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    await page.waitForTimeout(400);
    const after = await measure();
    expect(after).toEqual(before);
    // El texto de debajo no queda tapado por el panel.
    const panelBox = await panel(page, COAT).boundingBox();
    expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThanOrEqual((before.heading?.y ?? 0) + 1);
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid="quick-add"]') !== null,
      { x: (before.price?.x ?? 0) + 10, y: (before.price?.y ?? 0) + 8 },
    );
    expect(hit).toBe(false);
  });

  test('enfocar una talla con el teclado no desplaza la foto dentro de su contenedor', async ({ page }) => {
    await open(page);
    await card(page, COAT).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await panel(page, COAT).getByTestId('quick-add-size').first().focus();
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    const media = card(page, COAT).locator('div.relative.aspect-3\\/4');
    expect(await media.evaluate((el) => el.scrollTop)).toBe(0);
    const image = await card(page, COAT).locator('img').first().boundingBox();
    const container = await media.boundingBox();
    expect(Math.abs((image?.y ?? 0) - (container?.y ?? 0))).toBeLessThanOrEqual(1);
  });

  test('tiene tallas cuadradas de 44 px y «Añadir a la cesta» a ancho completo, desactivado hasta elegir talla', async ({ page }) => {
    await open(page);
    await hoverPhoto(page, COAT);
    const sizes = panel(page, COAT).getByTestId('quick-add-size');
    await expect(sizes).toHaveText(['S', 'M', 'L', 'XL']);
    for (let i = 0; i < 4; i++) {
      const box = await sizes.nth(i).boundingBox();
      expect(Math.round(box?.width ?? 0)).toBe(44);
      expect(Math.round(box?.height ?? 0)).toBe(44);
      expect(await sizes.nth(i).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
    }
    const button = panel(page, COAT).getByTestId('quick-add-button');
    await expect(button).toHaveText('Añadir a la cesta');
    await expect(button).toBeDisabled();
    const inner = await panel(page, COAT).boundingBox();
    const width = (await button.boundingBox())?.width ?? 0;
    expect(width).toBeGreaterThan((inner?.width ?? 0) - 40);
    await sizes.nth(1).click();
    await expect(sizes.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeEnabled();
  });

  test('elegir talla y pulsar el botón añade esa variante, con aviso aria-live; otra pulsación suma una unidad; el carrito la muestra', async ({ page }) => {
    await open(page);
    await hoverPhoto(page, COAT);
    expect(await savedCart(page)).toEqual([]);
    await panel(page, COAT).getByTestId('quick-add-size').nth(2).click();
    // WebKit no da foco a un botón al pulsarlo con el ratón: se activa con el teclado (foco + Intro) para comprobar el foco.
    await panel(page, COAT).getByTestId('quick-add-button').focus();
    await panel(page, COAT).getByTestId('quick-add-button').press('Enter');
    await expect(panel(page, COAT).getByText('Abrigo de paño gris añadido al carrito.')).toBeVisible();
    await expect(panel(page, COAT).locator('[aria-live="polite"]')).toHaveCount(1);
    await expect(panel(page, COAT).getByRole('link', { name: 'Ver carrito' })).toHaveAttribute('href', '/carrito');
    const cart = await savedCart(page);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.qty).toBe(1);
    // Desde T-085 añadir abre el carrito lateral; se cierra con Esc (el foco vuelve al botón) y se vuelve a añadir.
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await expect(panel(page, COAT).getByTestId('quick-add-button')).toBeFocused();
    await panel(page, COAT).getByTestId('quick-add-button').press('Enter');
    await expect.poll(async () => (await savedCart(page))[0]?.qty).toBe(2);
    await expect(page.getByTestId('drawer-qty')).toHaveText('2');
    await page.goto('/carrito');
    await expect(page.getByText('Abrigo de paño gris').first()).toBeVisible();
  });

  test('elegir un círculo de color cambia la foto y las tallas, borra la talla elegida y cada color añade su variante', async ({ page }) => {
    await open(page);
    const target = card(page, POLO);
    await hoverPhoto(page, POLO);
    const dots = target.getByTestId('quick-add-color');
    const sizes = panel(page, POLO).getByTestId('quick-add-size');
    const add = panel(page, POLO).getByTestId('quick-add-button');
    const labels = await dots.evaluateAll((items) => items.map((i) => i.getAttribute('aria-label') ?? ''));
    const initialAlt = await target.getByTestId('card-image').getAttribute('alt');
    await sizes.first().click();
    await expect(add).toBeEnabled();
    await add.click();
    await expect(panel(page, POLO).getByText('añadido al carrito.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    const other = await dots.evaluateAll((items) => items.findIndex((i) => i.getAttribute('aria-pressed') === 'false'));
    await dots.nth(other).click();
    await expect(dots.nth(other)).toHaveAttribute('aria-pressed', 'true');
    const color = (labels[other] ?? '').replace('Color ', '').toLowerCase();
    await expect(target.getByTestId('card-image')).toHaveAttribute('alt', new RegExp(`color ${color}$`, 'i'));
    expect(await target.getByTestId('card-image').getAttribute('alt')).not.toBe(initialAlt);
    await expect(add).toBeDisabled();
    await sizes.first().click();
    await add.click();
    await expect.poll(async () => (await savedCart(page)).length).toBe(2);
    expect(new Set((await savedCart(page)).map((line) => line.variantId)).size).toBe(2);
    await expect(page.getByTestId('drawer-line')).toHaveCount(2);
  });

  test('pulsar la foto o el nombre lleva a la ficha; pulsar un control no navega', async ({ page }) => {
    await open(page);
    await hoverPhoto(page, COAT);
    await panel(page, COAT).getByTestId('quick-add-size').first().click();
    await expect(page).toHaveURL(/\/hombre$/);
    // Se recoloca el cursor y se mide justo antes de pulsar: con la carga en paralelo la imagen puede haberse desplazado.
    await hoverPhoto(page, COAT);
    await page.waitForTimeout(300);
    const image = await card(page, COAT).locator('img').first().boundingBox();
    await page.mouse.click((image?.x ?? 0) + (image?.width ?? 0) / 2, (image?.y ?? 0) + 60);
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
    await page.goBack();
    await card(page, COAT).getByRole('link', { name: COAT, exact: true }).click();
    await expect(page).toHaveURL(/\/producto\/abrigo-pano-gris/);
  });
});

test.describe('teclado y movimiento (CA-122)', () => {
  test('con el foco dentro de la tarjeta el panel aparece; Esc lo oculta y devuelve el foco al enlace; al salir vuelve a poder verse', async ({ page }) => {
    await open(page);
    await card(page, COAT).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const size = panel(page, COAT).getByTestId('quick-add-size').first();
    await size.focus();
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    await page.keyboard.press('Escape');
    await expect(panel(page, COAT)).toHaveCSS('opacity', '0');
    await expect(card(page, COAT).getByRole('link', { name: COAT, exact: true })).toBeFocused();
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    await size.focus();
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
  });

  test('se elige color, talla y se añade solo con teclado', async ({ page }) => {
    await open(page);
    await card(page, POLO).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const dots = card(page, POLO).getByTestId('quick-add-color');
    await dots.nth(1).focus();
    expect(await dots.nth(1).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await panel(page, POLO).getByTestId('quick-add-size').first().focus();
    await page.keyboard.press('Enter');
    await panel(page, POLO).getByTestId('quick-add-button').focus();
    await page.keyboard.press('Enter');
    await expect(panel(page, POLO).getByText('añadido al carrito.')).toBeVisible();
    expect(await savedCart(page)).toHaveLength(1);
  });

  test('la transición usa opacity y translate (0,3 s) y con prefers-reduced-motion no hay transición ni desplazamiento', async ({ page }) => {
    await open(page);
    const style = await panel(page, COAT).evaluate((el) => {
      const s = getComputedStyle(el);
      return { property: s.transitionProperty, duration: s.transitionDuration };
    });
    expect(style.property).toContain('opacity');
    expect(style.property).toContain('translate');
    expect(style.duration).toContain('0.3s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await panel(page, COAT).evaluate((el) => {
      const s = getComputedStyle(el);
      return { property: s.transitionProperty, translate: s.translate };
    });
    expect(reduced.property).toBe('none');
    expect(['none', '0px', '0px 0px']).toContain(reduced.translate);
  });
});

test.describe('anchos y otras páginas (CA-122)', () => {
  test('desde 768 px existe el panel y a 767, 375 y 320 px no', async ({ page }) => {
    await open(page, '/hombre', 768);
    await hoverPhoto(page, COAT);
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    for (const width of [767, 375, 320]) {
      await open(page, '/hombre', width);
      expect(await panel(page, COAT).evaluate((el) => getComputedStyle(el).display), `${width} px`).toBe('none');
    }
  });

  test('en móvil la tarjeta es foto, círculos decorativos, nombre y precio; tocarla lleva a la ficha', async ({ page }) => {
    await open(page, '/hombre', 375);
    const target = card(page, POLO);
    await target.scrollIntoViewIfNeeded();
    await expect(target.getByTestId('card-colors')).toBeVisible();
    await expect(target.getByTestId('card-colors').locator('span')).toHaveCount(3);
    expect(await target.getByTestId('card-colors').getAttribute('aria-hidden')).toBe('true');
    await expect(target.getByTestId('color-dots')).toBeHidden();
    await expect(target.getByTestId('quick-add-size').first()).toBeHidden();
    await expect(target.getByTestId('quick-add-button')).toBeHidden();
    await target.getByRole('link', { name: POLO, exact: true }).click();
    await expect(page).toHaveURL(/\/producto\/polo-pique-basico/);
  });

  test('la portada lleva los círculos pero no el panel', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('quick-add')).toHaveCount(0);
    await expect(page.getByTestId('card-colors').first()).toBeVisible();
  });

  // CA-141 y CA-142 (T-098, Enmienda 42): la búsqueda usa la misma tarjeta que el catálogo.
  test('la búsqueda tiene el panel de tallas al pasar el cursor y añade al carrito', async ({ page }) => {
    await open(page, '/buscar?q=abrigo');
    await hoverPhoto(page, COAT);
    await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
    const sizes = panel(page, COAT).getByTestId('quick-add-size');
    await expect(sizes).toHaveText(['S', 'M', 'L', 'XL']);
    const button = panel(page, COAT).getByTestId('quick-add-button');
    await expect(button).toBeDisabled();
    await sizes.nth(1).click();
    await expect(button).toBeEnabled();
    expect(await savedCart(page)).toEqual([]);
    await button.click();
    await expect(panel(page, COAT).getByText('Abrigo de paño gris añadido al carrito.')).toBeVisible();
    await expect(page.getByTestId('cart-drawer')).toBeVisible();
    expect(await savedCart(page)).toHaveLength(1);
  });

  test('la búsqueda a 375 px solo lleva foto, círculos, nombre y precio', async ({ page }) => {
    await open(page, '/buscar?q=abrigo', 375);
    const target = card(page, COAT);
    await expect(target.getByTestId('card-colors')).toBeVisible();
    await expect(target.getByTestId('quick-add-button')).toBeHidden();
    await expect(target.getByTestId('card-price')).toBeVisible();
  });

  for (const width of [320, 375, 480, 600, 768, 1024, 1280]) {
    test(`la búsqueda no tiene scroll horizontal a ${width} px${width >= 768 ? ' con el panel abierto' : ''}`, async ({ page }) => {
      await open(page, '/buscar?q=abrigo', width);
      if (width >= 768) {
        await hoverPhoto(page, COAT);
        await expect(panel(page, COAT)).toHaveCSS('opacity', '1');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  for (const width of [320, 375, 768, 1024, 1280]) {
    test(`sin scroll horizontal a ${width} px${width >= 768 ? ' con el panel abierto' : ''}`, async ({ page }) => {
      await open(page, '/hombre', width);
      if (width >= 768) {
        await hoverPhoto(page, POLO);
        await expect(panel(page, POLO)).toHaveCSS('opacity', '1');
        const box = await panel(page, POLO).boundingBox();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('axe sin violaciones graves con el panel abierto', async ({ page }) => {
    await open(page);
    await hoverPhoto(page, POLO);
    await expect(panel(page, POLO)).toHaveCSS('opacity', '1');
    await panel(page, POLO).getByTestId('quick-add-size').first().click();
    const results = await new AxeBuilder({ page }).include('article:has([data-testid="color-dots"])').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
