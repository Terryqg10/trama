import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { saveAccountCart } from '../../src/lib/cart/account';
import { checkoutInputSchema, createCheckout } from '../../src/lib/checkout/create-checkout';
import { checkCouponForUser } from '../../src/lib/coupons/store';
import type { Database } from '../../src/lib/db/types.generated';
import { createStripeClient } from '../../src/lib/stripe/client';
import { createAddress, createCoupon, createProduct, createVariant, DAY_MS, newTag } from './coupon-fixtures';
import { createTestUser, deleteTestUser, sampleShippingAddress, serviceClient, type TestUser } from './helpers';

// CA-137 (T-093): el servidor valida el código en el pago y aplica el descuento. Contra la BD real y la API de Stripe en MODO
// TEST (sesiones de prueba que caducan solas). Requiere la migración 20261023000000_welcome_coupons.sql aplicada.

type Client = SupabaseClient<Database>;
const stripe = createStripeClient({ STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] });
const origin = 'http://localhost:3000';

let admin: SupabaseClient;
let user: TestUser;
let second: TestUser;
let third: TestUser;
let productId = '';
let variant = '';
const addresses = new Map<string, string>();
const couponIds: string[] = [];
const orderIds: string[] = [];

const asClient = (u: TestUser): Client => u.client;

async function newCoupon(overrides: Record<string, unknown> = {}) {
  const coupon = await createCoupon(admin, overrides);
  couponIds.push(coupon.id);
  return coupon;
}

async function checkout(forUser: TestUser, couponCode?: string) {
  await saveAccountCart(asClient(forUser), forUser.id, [{ variantId: variant, qty: 1 }]); // 1 × 19,95 €
  const result = await createCheckout(
    { userClient: asClient(forUser), serviceClient: admin, stripe },
    { userId: forUser.id, email: null, addressId: addresses.get(forUser.id) ?? '', couponCode, origin },
  );
  if (result.status === 'redirect') orderIds.push(result.orderId);
  return result;
}

async function orderRow(orderId: string) {
  const row = await admin.from('orders').select('status, total_cents, shipping_cents, discount_cents, coupon_id').eq('id', orderId).single();
  return z
    .object({ status: z.string(), total_cents: z.number(), shipping_cents: z.number(), discount_cents: z.number(), coupon_id: z.string().nullable() })
    .parse(row.data);
}

async function pendingCount(userId: string): Promise<number> {
  const rows = await admin.from('orders').select('id').eq('user_id', userId).eq('status', 'pendiente');
  return (rows.data ?? []).length;
}

beforeAll(async () => {
  admin = serviceClient();
  user = await createTestUser(admin, 'coupon-checkout');
  second = await createTestUser(admin, 'coupon-checkout-2');
  third = await createTestUser(admin, 'coupon-checkout-3');
  productId = await createProduct(admin, 't093-checkout');
  variant = await createVariant(admin, productId, newTag(), 'S', 1995, 50);
  for (const u of [user, second, third]) addresses.set(u.id, await createAddress(u));
});

afterAll(async () => {
  if (!admin) return;
  const mine = await admin.from('orders').select('id').in('user_id', [user?.id ?? '', second?.id ?? '', third?.id ?? '']);
  const ids = [...orderIds, ...z.array(z.object({ id: z.string() })).parse(mine.data ?? []).map((row) => row.id)];
  if (ids.length > 0) await admin.from('orders').delete().in('id', ids);
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
  if (productId) await admin.from('products').delete().eq('id', productId);
  for (const u of [user, second, third]) if (u) await deleteTestUser(admin, u.id);
});

describe('checkout-coupon: un código válido (CA-137)', () => {
  it('da el 10 % y deja el descuento y el cupón en el pedido', async () => {
    const coupon = await newCoupon();
    const result = await checkout(user, coupon.code);
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    // 19,95 € − 10 % (1,99 €, hacia abajo) + 4,95 € de envío = 22,91 €.
    expect(await orderRow(result.orderId)).toEqual({
      status: 'pendiente',
      total_cents: 2291,
      shipping_cents: 495,
      discount_cents: 199,
      coupon_id: coupon.id,
    });
  });

  it('acepta el código en minúsculas y con espacios alrededor', async () => {
    const coupon = await newCoupon();
    const result = await checkout(second, `  ${coupon.code.toLowerCase()}  `);
    expect(result.status).toBe('redirect');
    if (result.status === 'redirect') expect((await orderRow(result.orderId)).coupon_id).toBe(coupon.id);
  });

  it('un nuevo intento con el mismo código sustituye al pedido pendiente anterior y deja un solo pedido activo con el cupón', async () => {
    const coupon = await newCoupon();
    const first = await checkout(third, coupon.code);
    const again = await checkout(third, coupon.code);
    expect(first.status).toBe('redirect');
    expect(again.status).toBe('redirect');
    const active = await admin.from('orders').select('id').eq('coupon_id', coupon.id).neq('status', 'cancelado');
    expect(active.data ?? []).toHaveLength(1);
    if (first.status === 'redirect') expect((await orderRow(first.orderId)).status).toBe('cancelado');
  });
});

describe('checkout-coupon: sin código no hay descuento (CA-137)', () => {
  it.each([undefined, '', '   '])('con el código %j el pedido no lleva descuento ni cupón', async (code) => {
    const result = await checkout(user, code);
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    expect(await orderRow(result.orderId)).toEqual({
      status: 'pendiente',
      total_cents: 2490,
      shipping_cents: 495,
      discount_cents: 0,
      coupon_id: null,
    });
  });
});

describe('checkout-coupon: un código que no vale se rechaza con su motivo y sin crear pedido (CA-137)', () => {
  it('un código que no existe, o con otro formato, es «unknown»', async () => {
    const before = await pendingCount(second.id);
    for (const code of ['TRAMA-ZZZZ-ZZZZ', 'NO-ES-UN-CODIGO', "TRAMA-ABCD-EFGH'; drop table orders;--"]) {
      expect(await checkout(second, code)).toEqual({ status: 'invalidCoupon', reason: 'unknown' });
    }
    expect(await pendingCount(second.id)).toBe(before);
  });

  it('un código caducado es «expired»', async () => {
    const coupon = await newCoupon({ expires_at: new Date(Date.now() - DAY_MS).toISOString() });
    expect(await checkout(second, coupon.code)).toEqual({ status: 'invalidCoupon', reason: 'expired' });
  });

  it('un código ya canjeado es «redeemed»', async () => {
    const coupon = await newCoupon({ redeemed_at: new Date().toISOString() });
    expect(await checkout(second, coupon.code)).toEqual({ status: 'invalidCoupon', reason: 'redeemed' });
  });

  it('un cliente con un pedido pagado ya no puede usarlo: «notFirstPurchase»', async () => {
    const buyer = await createTestUser(admin, 'coupon-checkout-buyer');
    try {
      addresses.set(buyer.id, await createAddress(buyer));
      const paid = await admin
        .from('orders')
        .insert({ user_id: buyer.id, status: 'pagado', total_cents: 1000, shipping_cents: 0, shipping_address: sampleShippingAddress })
        .select('id')
        .single();
      expect(paid.error).toBeNull();
      const coupon = await newCoupon();
      expect(await checkout(buyer, coupon.code)).toEqual({ status: 'invalidCoupon', reason: 'notFirstPurchase' });
      const check = await checkCouponForUser(admin, buyer.id, coupon.code);
      expect(check).toEqual({ ok: false, reason: 'notFirstPurchase' });
    } finally {
      await admin.from('orders').delete().eq('user_id', buyer.id);
      await deleteTestUser(admin, buyer.id);
    }
  });

  it('los pedidos pendientes o cancelados no cuentan como compra hecha', async () => {
    const buyer = await createTestUser(admin, 'coupon-checkout-pend');
    try {
      for (const status of ['pendiente', 'cancelado'] as const) {
        const inserted = await admin
          .from('orders')
          .insert({ user_id: buyer.id, status, total_cents: 1000, shipping_cents: 0, shipping_address: sampleShippingAddress });
        expect(inserted.error).toBeNull();
      }
      const coupon = await newCoupon();
      expect((await checkCouponForUser(admin, buyer.id, coupon.code)).ok).toBe(true);
    } finally {
      await admin.from('orders').delete().eq('user_id', buyer.id);
      await deleteTestUser(admin, buyer.id);
    }
  });

  it('un código que otro cliente tiene en un pago en curso es «inUse» y no crea pedido', async () => {
    const coupon = await newCoupon();
    const owner = await checkout(user, coupon.code);
    expect(owner.status).toBe('redirect');
    const before = await pendingCount(second.id);
    expect(await checkout(second, coupon.code)).toEqual({ status: 'invalidCoupon', reason: 'inUse' });
    expect(await pendingCount(second.id)).toBe(before);
  });
});

describe('checkout-coupon: la entrada del formulario (CA-10, CA-137)', () => {
  const addressId = '11111111-1111-4111-8111-111111111111';

  it('solo lee la dirección y el texto del código; cualquier otro campo se descarta', () => {
    const parsed = checkoutInputSchema.safeParse({
      addressId,
      couponCode: '  trama-abcd-efgh ',
      price: '1',
      discount_cents: '999999',
      total_cents: '1',
      percent_off: '100',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual({ addressId, couponCode: 'trama-abcd-efgh' });
  });

  it('el código es opcional y no puede ser larguísimo', () => {
    expect(checkoutInputSchema.safeParse({ addressId }).success).toBe(true);
    expect(checkoutInputSchema.safeParse({ addressId, couponCode: 'A'.repeat(41) }).success).toBe(false);
  });
});
