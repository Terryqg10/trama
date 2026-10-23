import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { POST } from '../../src/app/api/stripe/webhook/route';
import { saveAccountCart } from '../../src/lib/cart/account';
import { createCheckout } from '../../src/lib/checkout/create-checkout';
import { checkCouponForUser } from '../../src/lib/coupons/store';
import type { Database } from '../../src/lib/db/types.generated';
import { createStripeClient } from '../../src/lib/stripe/client';
import { createAddress, createCoupon, createProduct, createVariant, newTag } from './coupon-fixtures';
import { createTestUser, deleteTestUser, serviceClient, type TestUser } from './helpers';

// CA-139 (T-093): el cupón se canjea cuando el pedido pasa a «pagado» (webhook firmado, ruta real), una sola vez; un pedido
// pendiente o cancelado no lo consume; y quien ya compró no puede usar otro. Contra la BD real y Stripe en MODO TEST.
// Requiere la migración 20261023000000_welcome_coupons.sql aplicada.

type Client = SupabaseClient<Database>;
const stripe = createStripeClient({ STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] });
const secret = z.string().startsWith('whsec_').parse(process.env['STRIPE_WEBHOOK_SECRET']);
const origin = 'http://localhost:3000';

let admin: SupabaseClient;
const users: TestUser[] = [];
const addresses = new Map<string, string>();
let productId = '';
let variant = '';
const couponIds: string[] = [];
const orderIds: string[] = [];
const eventIds: string[] = [];

const asClient = (u: TestUser): Client => u.client;

async function newUser(label: string): Promise<TestUser> {
  const created = await createTestUser(admin, label);
  users.push(created);
  addresses.set(created.id, await createAddress(created));
  return created;
}

async function newCoupon() {
  const coupon = await createCoupon(admin);
  couponIds.push(coupon.id);
  return coupon;
}

/** Pedido pendiente creado por el checkout real, con el código dado. */
async function checkout(forUser: TestUser, couponCode?: string) {
  await saveAccountCart(asClient(forUser), forUser.id, [{ variantId: variant, qty: 1 }]);
  const result = await createCheckout(
    { userClient: asClient(forUser), serviceClient: admin, stripe },
    { userId: forUser.id, email: null, addressId: addresses.get(forUser.id) ?? '', couponCode, origin },
  );
  if (result.status === 'redirect') orderIds.push(result.orderId);
  return result;
}

async function pendingOrder(forUser: TestUser, couponCode?: string): Promise<string> {
  const result = await checkout(forUser, couponCode);
  if (result.status !== 'redirect') throw new Error(`checkout de prueba rechazado: ${result.status}`);
  return result.orderId;
}

function payload(type: string, orderId: string, options: { id?: string; paymentStatus?: string } = {}): string {
  const id = options.id ?? `evt_test_${randomUUID()}`;
  eventIds.push(id);
  return JSON.stringify({
    id,
    object: 'event',
    api_version: '2025-01-01',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type,
    data: {
      object: {
        id: `cs_test_${randomUUID()}`,
        object: 'checkout.session',
        client_reference_id: orderId,
        payment_status: options.paymentStatus ?? 'paid',
        metadata: { order_id: orderId },
      },
    },
  });
}

async function deliver(body: string): Promise<{ status: number; outcome: string | null }> {
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  const response = await POST(
    new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body,
      headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    }),
  );
  const json: unknown = await response.json();
  const parsed = z.object({ outcome: z.string().optional() }).safeParse(json);
  return { status: response.status, outcome: parsed.success ? (parsed.data.outcome ?? null) : null };
}

async function couponRow(couponId: string) {
  const row = await admin.from('welcome_coupons').select('redeemed_at, redeemed_order_id').eq('id', couponId).single();
  return z.object({ redeemed_at: z.string().nullable(), redeemed_order_id: z.string().nullable() }).parse(row.data);
}

async function orderStatus(orderId: string): Promise<string> {
  const row = await admin.from('orders').select('status').eq('id', orderId).single();
  return z.object({ status: z.string() }).parse(row.data).status;
}

beforeAll(async () => {
  admin = serviceClient();
  productId = await createProduct(admin, 't093-redeem');
  variant = await createVariant(admin, productId, newTag(), 'S', 1995, 100);
});

afterAll(async () => {
  if (!admin) return;
  const mine = await admin.from('orders').select('id').in('user_id', users.map((u) => u.id));
  const ids = [...orderIds, ...z.array(z.object({ id: z.string() })).parse(mine.data ?? []).map((row) => row.id)];
  if (ids.length > 0) await admin.from('orders').delete().in('id', ids);
  if (eventIds.length > 0) await admin.from('stripe_events').delete().in('event_id', eventIds);
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
  if (productId) await admin.from('products').delete().eq('id', productId);
  for (const u of users) await deleteTestUser(admin, u.id);
});

describe('coupon-redeem: el pago confirmado canjea el cupón (CA-139)', () => {
  it('el pedido pasa a pagado y el cupón queda canjeado con ese pedido', async () => {
    const buyer = await newUser('redeem-buyer');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    expect(await couponRow(coupon.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });

    const outcome = await deliver(payload('checkout.session.completed', orderId));
    expect(outcome).toEqual({ status: 200, outcome: 'paid' });
    expect(await orderStatus(orderId)).toBe('pagado');
    const redeemed = await couponRow(coupon.id);
    expect(redeemed.redeemed_order_id).toBe(orderId);
    expect(redeemed.redeemed_at).not.toBeNull();
  });

  it('un evento repetido no vuelve a tocar el cupón: se canjea una sola vez', async () => {
    const buyer = await newUser('redeem-dup');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    const body = payload('checkout.session.completed', orderId, { id: `evt_test_${randomUUID()}` });

    expect((await deliver(body)).outcome).toBe('paid');
    const first = await couponRow(coupon.id);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const repeated = await deliver(body);
    expect(repeated).toEqual({ status: 200, outcome: 'duplicate' });
    expect(await couponRow(coupon.id)).toEqual(first);
  });

  it('un evento distinto de un pedido ya pagado tampoco cambia el canje', async () => {
    const buyer = await newUser('redeem-again');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    await deliver(payload('checkout.session.completed', orderId));
    const first = await couponRow(coupon.id);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await deliver(payload('checkout.session.async_payment_succeeded', orderId));
    expect(await couponRow(coupon.id)).toEqual(first);
  });

  it('un pago sin cupón no canjea nada: otro cupón sin usar sigue sin usar', async () => {
    const buyer = await newUser('redeem-plain');
    const bystander = await newCoupon();
    const orderId = await pendingOrder(buyer);
    expect((await deliver(payload('checkout.session.completed', orderId))).outcome).toBe('paid');
    expect(await couponRow(bystander.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });
  });
});

describe('coupon-redeem: lo que no consume el cupón (CA-139)', () => {
  it('un pedido pendiente con cupón no lo consume', async () => {
    const buyer = await newUser('redeem-pending');
    const coupon = await newCoupon();
    await pendingOrder(buyer, coupon.code);
    expect(await couponRow(coupon.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });
  });

  it('un pago sin completar (payment_status unpaid) no canjea nada', async () => {
    const buyer = await newUser('redeem-unpaid');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    const outcome = await deliver(payload('checkout.session.completed', orderId, { paymentStatus: 'unpaid' }));
    expect(outcome.outcome).toBe('ignored');
    expect(await orderStatus(orderId)).toBe('pendiente');
    expect(await couponRow(coupon.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });
  });

  it('una sesión caducada cancela el pedido y el cupón queda libre para volver a usarse', async () => {
    const buyer = await newUser('redeem-expired');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    expect((await deliver(payload('checkout.session.expired', orderId))).outcome).toBe('cancelled');
    expect(await orderStatus(orderId)).toBe('cancelado');
    expect(await couponRow(coupon.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });
    expect((await checkCouponForUser(admin, buyer.id, coupon.code)).ok).toBe(true);
    // Otro cliente puede usarlo ahora: el índice solo cuenta los pedidos no cancelados.
    const next = await newUser('redeem-expired-next');
    expect((await checkout(next, coupon.code)).status).toBe('redirect');
  });
});

describe('coupon-redeem: después de canjear (CA-139)', () => {
  it('el mismo código no sirve a otro cliente: «redeemed»', async () => {
    const buyer = await newUser('redeem-first');
    const coupon = await newCoupon();
    const orderId = await pendingOrder(buyer, coupon.code);
    await deliver(payload('checkout.session.completed', orderId));

    const other = await newUser('redeem-late');
    expect(await checkout(other, coupon.code)).toEqual({ status: 'invalidCoupon', reason: 'redeemed' });
  });

  it('quien ya pagó no puede usar otro código: «notFirstPurchase»', async () => {
    const buyer = await newUser('redeem-notfirst');
    const first = await newCoupon();
    const orderId = await pendingOrder(buyer, first.code);
    await deliver(payload('checkout.session.completed', orderId));

    const second = await newCoupon();
    expect(await checkout(buyer, second.code)).toEqual({ status: 'invalidCoupon', reason: 'notFirstPurchase' });
    expect(await couponRow(second.id)).toEqual({ redeemed_at: null, redeemed_order_id: null });
  });
});
