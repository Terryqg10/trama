import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { saveAccountCart } from '../../src/lib/cart/account';
import { createCheckout } from '../../src/lib/checkout/create-checkout';
import type { Database } from '../../src/lib/db/types.generated';
import { createStripeClient } from '../../src/lib/stripe/client';
import { createAddress, createCoupon, createProduct, createVariant, newTag } from './coupon-fixtures';
import { createTestUser, deleteTestUser, serviceClient, type TestUser } from './helpers';

// CA-138 (T-093): con un código válido, Stripe cobra exactamente subtotal − descuento + envío. El descuento es el 10 % del
// subtotal redondeado hacia abajo, y el envío gratis se decide con el subtotal ANTES del descuento. Contra la BD real y la API de
// Stripe en MODO TEST (`createStripeClient` rechaza una clave live). Requiere la migración 20261023000000_welcome_coupons.sql.

type Client = SupabaseClient<Database>;
const stripe = createStripeClient({ STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] });
const origin = 'http://localhost:3000';

let admin: SupabaseClient;
let user: TestUser;
let addressId = '';
let productId = '';
const variants = new Map<string, string>();
const couponIds: string[] = [];

const asClient = (u: TestUser): Client => u.client;
const rowSchema = z.object({
  total_cents: z.number(),
  shipping_cents: z.number(),
  discount_cents: z.number(),
  stripe_session_id: z.string(),
});

interface Case {
  readonly name: string;
  /** Precio por unidad y cantidad (el umbral de envío gratis es 50,00 €). */
  readonly price: number;
  readonly qty: number;
  readonly subtotal: number;
  readonly discount: number;
  readonly shipping: number;
  readonly total: number;
}

const CASES: readonly Case[] = [
  { name: 'bajo el umbral: paga el envío (19,95 €)', price: 1995, qty: 1, subtotal: 1995, discount: 199, shipping: 495, total: 2291 },
  { name: 'justo en el umbral: envío gratis aunque el descuento lo baje de 50 € (2 × 25,00 €)', price: 2500, qty: 2, subtotal: 5000, discount: 500, shipping: 0, total: 4500 },
  { name: 'por encima del umbral: envío gratis (2 × 30,00 €)', price: 3000, qty: 2, subtotal: 6000, discount: 600, shipping: 0, total: 5400 },
  { name: 'a un céntimo del umbral: sigue pagando el envío (49,99 €)', price: 4999, qty: 1, subtotal: 4999, discount: 499, shipping: 495, total: 4995 },
  { name: 'redondea el descuento hacia abajo (0,19 € → 0,01 €)', price: 19, qty: 1, subtotal: 19, discount: 1, shipping: 495, total: 513 },
];

beforeAll(async () => {
  admin = serviceClient();
  user = await createTestUser(admin, 'coupon-amounts');
  addressId = await createAddress(user);
  productId = await createProduct(admin, 't093-amounts');
  const tag = newTag();
  for (const [index, testCase] of CASES.entries()) {
    variants.set(testCase.name, await createVariant(admin, productId, tag, `T${index}`, testCase.price, 20));
  }
});

afterAll(async () => {
  if (!admin) return;
  const mine = await admin.from('orders').select('id').eq('user_id', user?.id ?? '');
  const ids = z.array(z.object({ id: z.string() })).parse(mine.data ?? []).map((row) => row.id);
  if (ids.length > 0) await admin.from('orders').delete().in('id', ids);
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
  if (productId) await admin.from('products').delete().eq('id', productId);
  if (user) await deleteTestUser(admin, user.id);
});

describe('checkout-coupon-amounts (CA-138)', () => {
  it.each(CASES)('$name', async (testCase) => {
    const coupon = await createCoupon(admin);
    couponIds.push(coupon.id);
    await saveAccountCart(asClient(user), user.id, [{ variantId: variants.get(testCase.name) ?? '', qty: testCase.qty }]);

    const result = await createCheckout(
      { userClient: asClient(user), serviceClient: admin, stripe },
      { userId: user.id, email: null, addressId, couponCode: coupon.code, origin },
    );
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;

    // El pedido guarda el descuento, el envío y el total que calcula el servidor.
    const stored = await admin.from('orders').select('total_cents, shipping_cents, discount_cents, stripe_session_id').eq('id', result.orderId).single();
    const order = rowSchema.parse(stored.data);
    expect(order.discount_cents).toBe(testCase.discount);
    expect(order.shipping_cents).toBe(testCase.shipping);
    expect(order.total_cents).toBe(testCase.total);
    expect(order.total_cents).toBe(testCase.subtotal - testCase.discount + testCase.shipping);

    // Y Stripe cobra exactamente eso: el mismo total, con el descuento y el envío por separado.
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    expect(session.amount_subtotal).toBe(testCase.subtotal);
    expect(session.total_details?.amount_discount).toBe(testCase.discount);
    expect(session.total_details?.amount_shipping).toBe(testCase.shipping);
    expect(session.amount_total).toBe(testCase.total);
    expect(session.currency).toBe('eur');
  });

  it('el cupón de Stripe es de importe fijo, de un solo uso y en euros', async () => {
    const coupon = await createCoupon(admin);
    couponIds.push(coupon.id);
    const first = CASES[0];
    if (!first) throw new Error('sin casos');
    await saveAccountCart(asClient(user), user.id, [{ variantId: variants.get(first.name) ?? '', qty: first.qty }]);
    const result = await createCheckout(
      { userClient: asClient(user), serviceClient: admin, stripe },
      { userId: user.id, email: null, addressId, couponCode: coupon.code, origin },
    );
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    const stored = await admin.from('orders').select('stripe_session_id').eq('id', result.orderId).single();
    const sessionId = z.object({ stripe_session_id: z.string() }).parse(stored.data).stripe_session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['total_details.breakdown'] });
    const discounts = session.total_details?.breakdown?.discounts ?? [];
    expect(discounts).toHaveLength(1);
    // En el SDK v23 el cupón cuelga de `discount.source.coupon` (un id, o el objeto si se expande).
    const source = discounts[0]?.discount.source.coupon;
    const stripeCouponId = typeof source === 'string' ? source : source?.id;
    expect(stripeCouponId).toBeTruthy();
    const stripeCoupon = await stripe.coupons.retrieve(stripeCouponId ?? '');
    expect(stripeCoupon).toMatchObject({ amount_off: first.discount, currency: 'eur', duration: 'once', max_redemptions: 1 });
  });

  it('sin código, Stripe cobra el subtotal más el envío sin ningún descuento', async () => {
    const first = CASES[0];
    if (!first) throw new Error('sin casos');
    await saveAccountCart(asClient(user), user.id, [{ variantId: variants.get(first.name) ?? '', qty: first.qty }]);
    const result = await createCheckout(
      { userClient: asClient(user), serviceClient: admin, stripe },
      { userId: user.id, email: null, addressId, origin },
    );
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    const stored = await admin.from('orders').select('stripe_session_id').eq('id', result.orderId).single();
    const sessionId = z.object({ stripe_session_id: z.string() }).parse(stored.data).stripe_session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    expect(session.total_details?.amount_discount).toBe(0);
    expect(session.amount_total).toBe(first.subtotal + first.shipping);
  });
});
