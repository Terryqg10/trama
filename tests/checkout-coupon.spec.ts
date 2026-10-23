import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';
import { generateCouponCode } from '../src/lib/coupons/code';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-137 (T-094, Enmienda 41): el campo «Código de descuento» del pago. Se aplica con «Aplicar», enseña el descuento y el total, se
// puede quitar, explica por qué un código no vale, y el pago lo recibe por un campo oculto que el servidor vuelve a validar. El flujo
// llega hasta la redirección a Stripe (modo test); no se completa el pago. Crea usuarios, cupones y pedidos de prueba reales.
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const admin = adminClient();
const createdEmails: string[] = [];
const couponIds: string[] = [];
const WIDTHS = [320, 375, 480, 640, 768, 1024, 1280];
const NEGRO_M = '/producto/polo-pique-basico?color=negro&talla=M';
// 1 × polo (29,90 €) + 4,95 € de envío = 34,85 €; con el 10 % (2,99 €, hacia abajo): 31,86 €.
const BASE_TOTAL = '34,85';
const COUPON_TOTAL = '31,86';

let main: { credentials: Credentials; id: string };

async function newUser(label: string): Promise<{ credentials: Credentials; id: string }> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  const inserted = await admin.from('addresses').insert({
    user_id: id,
    recipient_name: 'Ana Pérez',
    line1: 'Calle Mayor 1',
    postal_code: '28001',
    city: 'Madrid',
    province: 'Madrid',
  });
  if (inserted.error) throw new Error(`addAddress: ${inserted.error.message}`);
  return { credentials, id };
}

async function newCoupon(overrides: Record<string, unknown> = {}): Promise<{ id: string; code: string }> {
  const inserted = await admin
    .from('welcome_coupons')
    .insert({ code: generateCouponCode(), email: `t094-${Math.random().toString(16).slice(2, 10)}@example.com`, ...overrides })
    .select('id, code')
    .single();
  if (inserted.error) throw new Error(`newCoupon: ${inserted.error.message}`);
  const coupon = z.object({ id: z.string(), code: z.string() }).parse(inserted.data);
  couponIds.push(coupon.id);
  return coupon;
}

async function clearCart(userId: string): Promise<void> {
  const cart = await admin.from('carts').select('id').eq('user_id', userId).maybeSingle();
  const id = cart.data ? z.object({ id: z.string() }).parse(cart.data).id : null;
  if (id) await admin.from('cart_items').delete().eq('cart_id', id);
}

async function orderOf(userId: string) {
  const rows = await admin
    .from('orders')
    .select('status, total_cents, discount_cents, coupon_id')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1);
  return z
    .array(z.object({ status: z.string(), total_cents: z.number(), discount_cents: z.number(), coupon_id: z.string().nullable() }))
    .parse(rows.data ?? [])[0];
}

async function pendingCount(userId: string): Promise<number> {
  const rows = await admin.from('orders').select('id').eq('user_id', userId).eq('status', 'pendiente');
  return (rows.data ?? []).length;
}

async function goToCheckout(page: Page, who: { credentials: Credentials; id: string }): Promise<void> {
  await clearCart(who.id);
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(who.credentials.email);
  await page.getByLabel('Contraseña').fill(who.credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto(NEGRO_M);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra' })).toBeVisible();
  // Espera a que el campo esté hidratado, no solo editable: antes, Intro envía el formulario de forma nativa y recarga la página.
  await expect(page.getByTestId('coupon-input')).toBeEditable();
  await page.waitForFunction(() => {
    const field = document.querySelector('[data-testid="coupon-input"]');
    return field !== null && Object.keys(field).some((key) => key.startsWith('__reactProps'));
  });
  await expect(page.getByTestId('checkout-total')).toContainText(BASE_TOTAL);
}

async function apply(page: Page, code: string): Promise<void> {
  await page.getByTestId('coupon-input').fill(code);
  await page.getByTestId('coupon-apply').click();
}

test.beforeAll(async () => {
  main = await newUser('coupon-main');
});

test.afterAll(async () => {
  for (const email of createdEmails) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = listed.data.users.find((candidate) => candidate.email === email);
    if (user) await admin.from('orders').delete().eq('user_id', user.id);
    await deleteUserByEmail(admin, email);
  }
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
});

test.describe('aplicar un código válido (CA-137)', () => {
  test('enseña el descuento, la línea «Descuento» y el total nuevo, y se puede quitar', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    expect(await page.getByTestId('checkout-discount').count()).toBe(0);

    // Se acepta en minúsculas y con espacios alrededor.
    await apply(page, `  ${coupon.code.toLowerCase()}  `);
    await expect(page.getByTestId('coupon-applied')).toContainText(coupon.code);
    await expect(page.getByTestId('coupon-applied')).toContainText('2,99');
    await expect(page.getByTestId('checkout-discount')).toContainText('2,99');
    await expect(page.getByTestId('checkout-total')).toContainText(COUPON_TOTAL);
    await expect(page.getByTestId('checkout-subtotal')).toContainText('29,90');
    await expect(page.getByTestId('checkout-shipping')).toContainText('4,95');
    await expect(page.getByTestId('coupon-input')).toHaveCount(0);
    expect(await page.getByTestId('coupon-message').getAttribute('aria-live')).toBe('polite');

    await page.getByTestId('coupon-remove').click();
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0);
    await expect(page.getByTestId('checkout-discount')).toHaveCount(0);
    await expect(page.getByTestId('checkout-total')).toContainText(BASE_TOTAL);
    await expect(page.getByTestId("coupon-input")).toHaveValue(`  ${coupon.code.toLowerCase()}  `);
  });

  test('«Aplicar» también funciona con Intro', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    await page.getByTestId('coupon-input').fill(coupon.code);
    await page.getByTestId('coupon-input').press('Enter');
    await expect(page.getByTestId('checkout-total')).toContainText(COUPON_TOTAL);
  });
});

test.describe('un código que no vale dice por qué (CA-137)', () => {
  test('no existe', async ({ page }) => {
    await goToCheckout(page, main);
    await apply(page, 'TRAMA-ZZZZ-ZZZZ');
    await expect(page.getByRole('alert').filter({ hasText: 'Ese código no existe' })).toBeVisible();
    await expect(page.getByTestId('coupon-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('coupon-input')).toHaveValue('TRAMA-ZZZZ-ZZZZ');
    await expect(page.getByTestId('checkout-total')).toContainText(BASE_TOTAL);
  });

  test('está caducado', async ({ page }) => {
    const coupon = await newCoupon({ expires_at: new Date(Date.now() - 86_400_000).toISOString() });
    await goToCheckout(page, main);
    await apply(page, coupon.code);
    await expect(page.getByRole('alert').filter({ hasText: 'Ese código ha caducado.' })).toBeVisible();
  });

  test('ya se ha usado', async ({ page }) => {
    const coupon = await newCoupon({ redeemed_at: new Date().toISOString() });
    await goToCheckout(page, main);
    await apply(page, coupon.code);
    await expect(page.getByRole('alert').filter({ hasText: 'Ese código ya se ha usado.' })).toBeVisible();
  });

  test('solo vale para la primera compra', async ({ page }) => {
    const buyer = await newUser('coupon-buyer');
    const paid = await admin.from('orders').insert({
      user_id: buyer.id,
      status: 'pagado',
      total_cents: 1000,
      shipping_cents: 0,
      shipping_address: { recipient_name: 'Ana Pérez', line1: 'Calle Mayor 1', postal_code: '28001', city: 'Madrid', province: 'Madrid', country: 'ES' },
    });
    expect(paid.error).toBeNull();
    const coupon = await newCoupon();
    await goToCheckout(page, buyer);
    await apply(page, coupon.code);
    await expect(page.getByRole('alert').filter({ hasText: 'solo vale para tu primera compra' })).toBeVisible();
  });

  test('escribir un código y no pulsar «Aplicar» lo recuerda con un aviso', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    await page.getByTestId('coupon-input').fill(coupon.code);
    await expect(page.getByTestId('coupon-hint')).toHaveText('Pulsa «Aplicar» para usar este código.');
    await expect(page.getByTestId('checkout-total')).toContainText(BASE_TOTAL);
  });
});

test.describe('pagar con el código (CA-137)', () => {
  test('el pago lleva el descuento y el cupón al pedido y redirige a Stripe', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    await apply(page, coupon.code);
    await expect(page.getByTestId('checkout-total')).toContainText(COUPON_TOTAL);

    await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    const order = await orderOf(main.id);
    expect(order).toEqual({ status: 'pendiente', total_cents: 3186, discount_cents: 299, coupon_id: coupon.id });
  });

  test('sin pulsar «Aplicar» el pago no lleva descuento', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    await page.getByTestId('coupon-input').fill(coupon.code);
    await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    const order = await orderOf(main.id);
    expect(order).toEqual({ status: 'pendiente', total_cents: 3485, discount_cents: 0, coupon_id: null });
  });

  test('un código manipulado en el campo oculto se rechaza en el servidor y no crea pedido', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    await apply(page, coupon.code);
    await expect(page.getByTestId('checkout-total')).toContainText(COUPON_TOTAL);
    // El navegador cambia el campo oculto y añade importes inventados: el servidor ignora los importes y revalida el código.
    await page.evaluate(() => {
      const form = document.querySelector('form:has(input[name="addressId"])');
      if (!form) throw new Error('No se encontró el formulario de pago');
      const hidden = form.querySelector<HTMLInputElement>('input[type="hidden"][name="couponCode"]');
      if (!hidden) throw new Error('No se encontró el campo oculto del código');
      hidden.value = 'TRAMA-ZZZZ-ZZZZ';
      for (const [name, value] of [['discount_cents', '999999'], ['total_cents', '1']] as const) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        form.appendChild(field);
      }
    });
    const before = await pendingCount(main.id);
    await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
    await expect(page.getByText('Ese código no existe')).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    expect(await pendingCount(main.id)).toBe(before);
  });
});

test.describe('maquetación y accesibilidad (CA-137)', () => {
  test('con el código aplicado, sin scroll horizontal ni recortes de 320 a 1280 px, y axe sin violaciones graves', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByTestId('coupon-box')).toBeVisible();
      const box = await page.getByTestId('coupon-box').boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} px`).toBe(true);
    }
    await apply(page, coupon.code);
    await expect(page.getByTestId('coupon-applied')).toBeVisible();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width} px`).toBeLessThanOrEqual(1);
      const applied = await page.getByTestId('coupon-applied').boundingBox();
      expect(applied && applied.x >= 0 && applied.x + applied.width <= width + 1, `${width} px`).toBe(true);
    }
    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });

  test('el botón «Aplicar» y el de «Quitar código» miden 44 px', async ({ page }) => {
    const coupon = await newCoupon();
    await goToCheckout(page, main);
    const apply44 = await page.getByTestId('coupon-apply').boundingBox();
    expect(apply44?.height).toBeGreaterThanOrEqual(43.9);
    await apply(page, coupon.code);
    const remove = await page.getByTestId('coupon-remove').boundingBox();
    expect(remove?.height).toBeGreaterThanOrEqual(43.9);
  });
});
