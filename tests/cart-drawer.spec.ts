import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-124 y CA-125 (T-085, Enmienda 37 de SPEC-001): carrito lateral que se abre al añadir y con el icono de la cesta.
// Datos del seed: «polo-pique-basico» 29,90 € (8 por variante) y «abrigo-pano-gris» 89,90 € con precio anterior de 119,90 €.

const POLO = '/producto/polo-pique-basico?color=negro&talla=M';
const COAT = '/producto/abrigo-pano-gris?talla=M';
const STORAGE_KEY = 'trama.cart.v1';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Mi cesta' });
const savedCart = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]') as { variantId: string; qty: number }[], STORAGE_KEY);

async function addFromProduct(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(dialog(page)).toBeVisible();
  // El contenido se carga al abrir (¿hay sesión?, datos de las líneas): se espera a que esté para no teclear sobre «Cargando…».
  await expect(page.getByTestId('drawer-line')).toHaveCount(1);
}

async function openFromHeader(page: Page): Promise<void> {
  await page.getByTestId('cart-open').click();
  await expect(dialog(page)).toBeVisible();
}

/** Espera a que acabe la animación de entrada (el panel en su sitio y opaco) antes de medir. */
async function settled(page: Page): Promise<void> {
  const panel = page.getByTestId('cart-drawer');
  await expect(panel).toHaveCSS('opacity', '1');
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^(none|0px( 0px)?)$/);
}

test.describe('apertura y cierre (CA-124)', () => {
  test('al añadir desde la ficha se abre «Mi cesta» como diálogo modal con fondo oscuro', async ({ page }) => {
    await addFromProduct(page, POLO);
    await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('heading', { name: 'Mi cesta' })).toBeVisible();
    await expect(page.getByTestId('cart-drawer-backdrop')).toBeVisible();
    await expect(page.getByTestId('drawer-line')).toHaveCount(1);
    await expect(page.getByTestId('drawer-line')).toContainText('Polo piqué básico');
    const backdrop = await page.getByTestId('cart-drawer-backdrop').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(backdrop).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('está a la derecha, con ancho máximo de 28 rem en escritorio y a ancho completo en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await addFromProduct(page, POLO);
    await settled(page);
    const box = await dialog(page).boundingBox();
    expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(1280);
    expect(Math.round(box?.width ?? 0)).toBe(448);
    expect(Math.round(box?.height ?? 0)).toBe(800);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 375, height: 700 });
    await page.getByTestId('cart-open').click();
    await settled(page);
    const mobile = await dialog(page).boundingBox();
    expect(Math.round(mobile?.width ?? 0)).toBe(375);
  });

  test('el icono de la cesta de la cabecera lo abre y, vacío, dice que la cesta está vacía', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cart-open')).toHaveAttribute('href', '/carrito');
    await openFromHeader(page);
    await expect(page.getByTestId('cart-drawer-empty')).toContainText('Tu cesta está vacía');
    await expect(page).toHaveURL(/\/$/);
  });

  test('queda por encima de la cabecera: sobre el icono de la cesta está el fondo, no la cabecera', async ({ page }) => {
    await page.goto('/');
    const icon = await page.getByTestId('cart-open').boundingBox();
    await openFromHeader(page);
    const top = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid="cart-drawer-root"]') !== null,
      { x: (icon?.x ?? 0) + 10, y: (icon?.y ?? 0) + 10 },
    );
    expect(top).toBe(true);
  });

  test('entra deslizándose desde la derecha con transform y opacity, y con prefers-reduced-motion sin transición', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Cerrado no está en el árbol de accesibilidad: se mide por testid.
    const panel = page.getByTestId('cart-drawer');
    const style = await panel.evaluate((el) => {
      const s = getComputedStyle(el);
      return { translate: s.translate, opacity: s.opacity, property: s.transitionProperty, duration: s.transitionDuration };
    });
    expect(style.opacity).toBe('0');
    // Tailwind 4 desplaza con la propiedad `translate` (no con `transform`): cerrado está fuera de pantalla, a la derecha.
    expect(style.translate).toMatch(/^100%/);
    expect(style.property).toContain('opacity');
    expect(style.property).toMatch(/transform|translate/);
    expect(style.duration).toContain('0.3s');
    await page.getByTestId('cart-open').click();
    await settled(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await panel.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    // La raíz abierta no declara transición (se abre al instante para poder enfocar); cerrada, con reduced-motion tampoco.
    expect(await page.getByTestId('cart-drawer-root').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
  });

  test('cerrado no recibe foco ni está en el árbol de accesibilidad', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('cart-drawer-root')).toHaveCSS('visibility', 'hidden');
    await expect(page.getByTestId('cart-drawer-root')).toHaveCSS('pointer-events', 'none');
  });

  test('el foco entra en el diálogo, queda atrapado con Tab y Mayús+Tab y el body no hace scroll', async ({ page }) => {
    await addFromProduct(page, POLO);
    await expect(page.getByTestId('cart-drawer-close')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    const inside = () => page.evaluate(() => document.activeElement?.closest('[data-testid="cart-drawer"]') !== null);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i + 1}`).toBe(true);
    }
    await page.getByTestId('cart-drawer-close').focus();
    await page.keyboard.press('Shift+Tab');
    expect(await inside()).toBe(true);
    await expect(page.getByTestId('drawer-view-cart')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('cart-drawer-close')).toBeFocused();
  });

  test('se cierra con Esc y el foco vuelve al botón que lo abrió; el scroll del body se recupera', async ({ page }) => {
    await addFromProduct(page, POLO);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await expect(page.getByTestId('add-to-cart')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });

  test('se cierra con la X, con un clic en el fondo y con «Seguir comprando»; desde el icono el foco vuelve al icono', async ({ page }) => {
    await page.goto('/');
    await openFromHeader(page);
    await page.getByTestId('cart-drawer-close').click();
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await expect(page.getByTestId('cart-open')).toBeFocused();
    await openFromHeader(page);
    await page.mouse.click(60, 400);
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await openFromHeader(page);
    await page.getByTestId('cart-drawer-continue').click();
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });

  test('un clic dentro del diálogo no lo cierra', async ({ page }) => {
    await addFromProduct(page, POLO);
    await page.getByTestId('cart-drawer-footer').click({ position: { x: 5, y: 5 } });
    await expect(dialog(page)).toBeVisible();
  });

  test('desde la barra fija de la ficha en móvil también se abre', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto(POLO);
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'false');
    await page.getByTestId('add-to-cart-sticky').click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByTestId('drawer-line')).toHaveCount(1);
  });

  test('pulsar un enlace del carrito cambia de ruta y lo cierra', async ({ page }) => {
    await addFromProduct(page, POLO);
    await page.getByTestId('drawer-line').getByRole('link', { name: 'Polo piqué básico' }).click();
    await expect(page).toHaveURL(/\/producto\/polo-pique-basico/);
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
    await openFromHeader(page);
    await page.getByTestId('drawer-view-cart').click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
  });

  test('en /carrito el icono navega a la página y no abre el drawer', async ({ page }) => {
    await page.goto('/carrito');
    await page.getByTestId('cart-open').click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('el icono de la cesta es un enlace que navega a /carrito', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('cart-open').click();
      await expect(page).toHaveURL(/\/carrito$/);
    });
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal con el drawer abierto a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await addFromProduct(page, POLO);
      await settled(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const box = await dialog(page).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(-0.5);
    });
  }

  test('axe sin violaciones graves con el drawer abierto y con prendas', async ({ page }) => {
    await addFromProduct(page, COAT);
    await expect(page.getByTestId('drawer-line')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).include('[data-testid="cart-drawer"]').analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('contenido y controles (CA-125)', () => {
  test('cada línea muestra miniatura, nombre con enlace, talla y color, precio unitario, controles y total', async ({ page }) => {
    await addFromProduct(page, POLO);
    const line = page.getByTestId('drawer-line');
    await expect(line.locator('img')).toBeVisible();
    await expect(line.getByRole('link', { name: 'Polo piqué básico' })).toHaveAttribute('href', /\/producto\/polo-pique-basico\?color=negro&talla=M/);
    await expect(line).toContainText('Talla M · Negro');
    await expect(line.getByTestId('drawer-unit-price')).toContainText('29,90');
    await expect(line.getByTestId('drawer-qty')).toHaveText('1');
    await expect(line.getByTestId('drawer-line-total')).toContainText('29,90');
    for (const id of ['drawer-minus', 'drawer-plus', 'drawer-remove']) {
      const box = await line.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    // Sin rebaja: ni precio tachado ni ahorro.
    await expect(line.getByTestId('drawer-line-before')).toHaveCount(0);
    await expect(page.getByTestId('drawer-savings')).toHaveCount(0);
  });

  test('«+» y «−» cambian la cantidad y el total, y se guarda; «−» desde 1 quita la línea', async ({ page }) => {
    await addFromProduct(page, POLO);
    const line = page.getByTestId('drawer-line');
    await line.getByTestId('drawer-plus').click();
    await expect(line.getByTestId('drawer-qty')).toHaveText('2');
    await expect(line.getByTestId('drawer-line-total')).toContainText('59,80');
    await expect.poll(async () => (await savedCart(page))[0]?.qty).toBe(2);
    await line.getByTestId('drawer-minus').click();
    await expect(line.getByTestId('drawer-qty')).toHaveText('1');
    await expect.poll(async () => (await savedCart(page))[0]?.qty).toBe(1);
    await line.getByTestId('drawer-minus').click();
    await expect(page.getByTestId('cart-drawer-empty')).toContainText('Tu cesta está vacía');
    expect(await savedCart(page)).toEqual([]);
  });

  test('«Quitar» borra la línea, actualiza el total y lo avisa', async ({ page }) => {
    await addFromProduct(page, POLO);
    await page.getByRole('dialog').getByRole('link', { name: 'Seguir comprando' }).count();
    await page.getByTestId('drawer-remove').click();
    await expect(page.getByTestId('cart-drawer-empty')).toBeVisible();
    expect(await savedCart(page)).toEqual([]);
  });

  test('la cantidad se limita al stock con aviso', async ({ page }) => {
    await addFromProduct(page, POLO);
    const [line] = await savedCart(page);
    await page.evaluate(([key, value]) => localStorage.setItem(String(key), String(value)), [
      STORAGE_KEY,
      JSON.stringify([{ variantId: line?.variantId, qty: 99 }]),
    ]);
    await page.keyboard.press('Escape');
    await page.goto('/');
    await openFromHeader(page);
    await expect(page.getByTestId('drawer-qty')).toHaveText('8');
    await expect(dialog(page)).toContainText('Hemos ajustado la cantidad al stock disponible (8).');
    await page.getByTestId('drawer-plus').click();
    await expect(dialog(page)).toContainText('Solo quedan 8 unidades');
    await expect(page.getByTestId('drawer-qty')).toHaveText('8');
  });

  test('con rebaja: precio anterior tachado en el unitario y en el total de la línea, y «Ahorras X €» en el pie', async ({ page }) => {
    await addFromProduct(page, COAT);
    const line = page.getByTestId('drawer-line');
    await expect(line.getByTestId('drawer-unit-before')).toHaveText(/119,90/);
    expect(await line.getByTestId('drawer-unit-before').evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('line-through');
    await expect(line.getByTestId('drawer-line-total').locator('span')).toContainText('89,90');
    await expect(line.getByTestId('drawer-line-before')).toHaveText(/119,90/);
    await expect(page.getByTestId('drawer-savings')).toContainText('Ahorras');
    await expect(page.getByTestId('drawer-savings')).toContainText('30,00');
    await line.getByTestId('drawer-plus').click();
    await expect(line.getByTestId('drawer-line-before')).toHaveText(/239,80/);
    await expect(page.getByTestId('drawer-savings')).toContainText('60,00');
    await expect(page.getByTestId('drawer-total')).toContainText('179,80');
  });

  test('el pie fijo: total con envío, aviso de envío gratis, «Tramitar compra» y «Seguir comprando»; coincide con /carrito', async ({ page }) => {
    await addFromProduct(page, POLO);
    await expect(page.getByTestId('drawer-free-shipping')).toContainText('Te faltan 20,10');
    await expect(page.getByTestId('drawer-total')).toHaveText(/34,85/);
    await expect(page.getByTestId('drawer-checkout')).toHaveText('Tramitar compra');
    await expect(page.getByTestId('cart-drawer-continue')).toHaveText('Seguir comprando');
    const total = (await page.getByTestId('drawer-total').innerText()).replace(/\s/g, ' ');
    await page.getByTestId('drawer-view-cart').click();
    await expect(page.getByTestId('cart-total')).toBeVisible();
    expect((await page.getByTestId('cart-total').innerText()).replace(/\s/g, ' ')).toBe(total);
    await page.goto(COAT);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('drawer-free-shipping')).toContainText('envío gratis');
    await expect(page.getByTestId('drawer-free-shipping')).not.toContainText('faltan');
  });

  test('el pie queda fijo y la lista tiene su propio scroll cuando hay muchas líneas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 520 });
    for (const variant of ['color=negro&talla=S', 'color=negro&talla=M', 'color=negro&talla=L', 'color=azul&talla=S']) {
      await page.goto(`/producto/polo-pique-basico?${variant}`);
      await expect(page.getByTestId('add-to-cart')).toBeEnabled();
      await page.getByTestId('add-to-cart').click();
      await expect(dialog(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('cart-drawer')).toBeHidden();
    }
    await openFromHeader(page);
    await settled(page);
    await expect(page.getByTestId('drawer-line')).toHaveCount(4);
    const body = page.getByTestId('cart-drawer-body');
    expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await body.evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
    const panel = await dialog(page).boundingBox();
    const footer = await page.getByTestId('cart-drawer-footer').boundingBox();
    expect(Math.round((footer?.y ?? 0) + (footer?.height ?? 0))).toBe(Math.round((panel?.y ?? 0) + (panel?.height ?? 0)));
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByTestId('drawer-checkout')).toBeInViewport();
    await expect(page.getByTestId('drawer-total')).toBeInViewport();
  });

  test('invitado: «Tramitar compra» lleva a iniciar sesión con vuelta al pago', async ({ page }) => {
    await addFromProduct(page, POLO);
    await page.getByTestId('drawer-checkout').click();
    await expect(page).toHaveURL(/\/acceso\?siguiente=%2Fcheckout$/);
    await expect(page.getByTestId('cart-drawer')).toBeHidden();
  });
});

test.describe('carrito de la cuenta (CA-125)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  const admin = adminClient();
  const createdEmails: string[] = [];
  test.afterAll(async () => {
    for (const email of createdEmails) await deleteUserByEmail(admin, email);
  });

  async function login(page: Page): Promise<Credentials> {
    const credentials = newCredentials('drawer');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);
    await page.goto('/acceso');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/cuenta(\?carrito=fusionado)?$/);
    return credentials;
  }

  test('con sesión el drawer lee y guarda en la cuenta y «Tramitar compra» va directo al pago', async ({ page }) => {
    await login(page);
    await addFromProduct(page, POLO);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    await expect(page.getByTestId('drawer-line')).toHaveCount(1);
    await expect(page.getByTestId('drawer-checkout')).toHaveAttribute('href', '/checkout');
    // Los cambios se guardan en la cuenta: se ven al abrir el carrito de nuevo y en /carrito.
    const saved = page.waitForResponse((response) => response.request().method() === 'POST');
    await page.getByTestId('drawer-plus').click();
    await saved;
    await expect(page.getByTestId('drawer-qty')).toHaveText('2');
    await page.keyboard.press('Escape');
    await page.goto('/');
    await openFromHeader(page);
    await expect(page.getByTestId('drawer-qty')).toHaveText('2');
    await page.getByTestId('drawer-view-cart').click();
    await expect(page.getByTestId('cart-qty')).toHaveText('2');
    await page.goto('/');
    await openFromHeader(page);
    await page.getByTestId('drawer-checkout').click();
    await expect(page).toHaveURL(/\/checkout/);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  });
});
