import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { POST } from '../../src/app/api/stripe/webhook/route';
import { reserveStock } from '../../src/lib/checkout/reservation';
import { createStripeClient } from '../../src/lib/stripe/client';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  sampleShippingAddress,
  serviceClient,
  type TestUser,
} from './helpers';

// T-033: webhook de Stripe (CA-11, CA-12, CA-13) contra la BD real. Los eventos se firman con el secreto
// configurado, igual que haría Stripe. Necesita aplicada la migración
// `20261018000000_confirm_payment.sql` en la base de datos de pruebas.

const idSchema = z.object({ id: z.string() });
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;
const secret = z.string().startsWith('whsec_').parse(process.env['STRIPE_WEBHOOK_SECRET']);
const stripe = createStripeClient({ STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] });

let admin: SupabaseClient;
let user: TestUser;
let productId = '';
let variantA = '';
let variantB = '';
const orderIds: string[] = [];
const eventIds: string[] = [];

async function createVariant(size: string, stock: number): Promise<string> {
  const inserted = await admin
    .from('product_variants')
    .insert({ product_id: productId, size, color: TAG, price_cents: 1000, stock })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createVariant: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

/** Pedido pendiente con su reserva activa, como lo deja el checkout. */
async function pendingOrder(lines: ReadonlyArray<{ variantId: string; qty: number }>): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({ user_id: user.id, total_cents: 1495, shipping_cents: 495, shipping_address: sampleShippingAddress })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createOrder: ${inserted.error.message}`);
  const id = idSchema.parse(inserted.data).id;
  orderIds.push(id);
  const reserved = await reserveStock(admin, id, lines);
  if (!reserved.ok) throw new Error(`reserva de prueba rechazada: ${reserved.reason}`);
  return id;
}

function eventPayload(type: string, orderId: string, overrides: { id?: string; paymentStatus?: string } = {}): string {
  const id = overrides.id ?? `evt_test_${randomUUID()}`;
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
        payment_status: overrides.paymentStatus ?? 'paid',
        metadata: { order_id: orderId },
      },
    },
  });
}

function signed(payload: string, withSecret = secret): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: withSecret });
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
  });
}

async function stockOf(variantId: string): Promise<number> {
  const row = await admin.from('product_variants').select('stock').eq('id', variantId).single();
  return z.object({ stock: z.number() }).parse(row.data).stock;
}

async function orderStatus(orderId: string): Promise<string> {
  const row = await admin.from('orders').select('status').eq('id', orderId).single();
  return z.object({ status: z.string() }).parse(row.data).status;
}

async function reservationStatuses(orderId: string): Promise<string[]> {
  const rows = await admin.from('stock_reservations').select('status').eq('order_id', orderId);
  return z.array(z.object({ status: z.string() })).parse(rows.data).map((row) => row.status).sort();
}

beforeAll(async () => {
  admin = serviceClient();
  user = await createTestUser(admin, 'webhook');
  const product = await admin
    .from('products')
    .insert({
      slug: `t033-${randomUUID().slice(0, 8)}`,
      name: 'Producto T-033',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  productId = idSchema.parse(product.data).id;
  variantA = await createVariant('S', 50);
  variantB = await createVariant('M', 30);
});

afterAll(async () => {
  if (!admin) return;
  if (orderIds.length > 0) await admin.from('orders').delete().in('id', orderIds);
  if (eventIds.length > 0) await admin.from('stripe_events').delete().in('event_id', eventIds);
  if (productId) await admin.from('products').delete().eq('id', productId);
  if (user) await deleteTestUser(admin, user.id);
});

describe('webhook-paid (CA-11)', () => {
  it('con firma válida el pedido pasa a pagado, se consume la reserva y se descuenta el stock', async () => {
    const order = await pendingOrder([
      { variantId: variantA, qty: 2 },
      { variantId: variantB, qty: 1 },
    ]);

    const response = await POST(signed(eventPayload('checkout.session.completed', order)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'paid' });

    expect(await orderStatus(order)).toBe('pagado');
    expect(await reservationStatuses(order)).toEqual(['consumida', 'consumida']);
    expect(await stockOf(variantA)).toBe(48);
    expect(await stockOf(variantB)).toBe(29);
  });

  it('async_payment_succeeded también confirma el pago', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    const before = await stockOf(variantA);
    const response = await POST(signed(eventPayload('checkout.session.async_payment_succeeded', order)));
    expect(response.status).toBe(200);
    expect(await orderStatus(order)).toBe('pagado');
    expect(await stockOf(variantA)).toBe(before - 1);
  });

  it('una sesión aún no pagada no cambia nada', async () => {
    const order = await pendingOrder([{ variantId: variantB, qty: 1 }]);
    const before = await stockOf(variantB);
    const response = await POST(signed(eventPayload('checkout.session.completed', order, { paymentStatus: 'unpaid' })));
    expect(response.status).toBe(200);
    expect(await orderStatus(order)).toBe('pendiente');
    expect(await reservationStatuses(order)).toEqual(['activa']);
    expect(await stockOf(variantB)).toBe(before);
  });
});

describe('webhook-bad-signature (CA-12)', () => {
  it('con firma inválida responde 400 y no hay cambios en la BD', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    const before = await stockOf(variantA);
    const payload = eventPayload('checkout.session.completed', order);

    const wrongSecret = await POST(signed(payload, 'whsec_otro_secreto'));
    expect(wrongSecret.status).toBe(400);

    // Cuerpo alterado después de firmar.
    const tampered = signed(payload);
    const alteredBody = new Request(tampered.url, {
      method: 'POST',
      body: payload.replace(order, randomUUID()),
      headers: { 'stripe-signature': tampered.headers.get('stripe-signature') ?? '' },
    });
    expect((await POST(alteredBody)).status).toBe(400);

    // Sin cabecera y con basura.
    expect((await POST(new Request(tampered.url, { method: 'POST', body: payload }))).status).toBe(400);
    expect(
      (await POST(new Request(tampered.url, { method: 'POST', body: 'no es json', headers: { 'stripe-signature': 't=1,v1=abc' } }))).status,
    ).toBe(400);

    expect(await orderStatus(order)).toBe('pendiente');
    expect(await reservationStatuses(order)).toEqual(['activa']);
    expect(await stockOf(variantA)).toBe(before);
    const recorded = await admin.from('stripe_events').select('event_id').eq('event_id', JSON.parse(payload).id);
    expect(recorded.data).toEqual([]);
  });
});

describe('webhook-idempotent (CA-13)', () => {
  it('el mismo evento recibido dos veces deja un solo pedido pagado y el stock descontado una vez', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    const before = await stockOf(variantA);
    const payload = eventPayload('checkout.session.completed', order);

    const first = await POST(signed(payload));
    const second = await POST(signed(payload));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, outcome: 'duplicate' });

    expect(await orderStatus(order)).toBe('pagado');
    expect(await stockOf(variantA)).toBe(before - 1);
    const events = await admin.from('stripe_events').select('event_id').eq('event_id', JSON.parse(payload).id);
    expect(events.data).toHaveLength(1);
  });

  it('dos entregas simultáneas del mismo evento descuentan el stock una sola vez', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    const before = await stockOf(variantA);
    const payload = eventPayload('checkout.session.completed', order);

    const responses = await Promise.all([POST(signed(payload)), POST(signed(payload)), POST(signed(payload))]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await orderStatus(order)).toBe('pagado');
    expect(await stockOf(variantA)).toBe(before - 1);
  });

  it('dos eventos distintos del mismo pago (fuera de orden) tampoco duplican el descuento', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    const before = await stockOf(variantA);

    await POST(signed(eventPayload('checkout.session.completed', order)));
    const late = await POST(signed(eventPayload('checkout.session.async_payment_succeeded', order)));
    expect(late.status).toBe(200);
    expect(await late.json()).toEqual({ received: true, outcome: 'lateOrUnknown' });
    expect(await stockOf(variantA)).toBe(before - 1);
  });
});

describe('caducidad y casos límite', () => {
  it('una sesión caducada cancela el pedido pendiente y libera la reserva', async () => {
    const order = await pendingOrder([{ variantId: variantB, qty: 1 }]);
    const before = await stockOf(variantB);
    const response = await POST(signed(eventPayload('checkout.session.expired', order)));
    expect(response.status).toBe(200);
    expect(await orderStatus(order)).toBe('cancelado');
    expect(await reservationStatuses(order)).toEqual(['liberada']);
    expect(await stockOf(variantB)).toBe(before);
  });

  it('un evento de caducidad que llega después del pago no cancela el pedido', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    await POST(signed(eventPayload('checkout.session.completed', order)));
    await POST(signed(eventPayload('checkout.session.expired', order)));
    expect(await orderStatus(order)).toBe('pagado');
    expect(await reservationStatuses(order)).toEqual(['consumida']);
  });

  it('un pago para un pedido cancelado se registra pero no cambia el pedido ni el stock', async () => {
    const order = await pendingOrder([{ variantId: variantA, qty: 1 }]);
    await POST(signed(eventPayload('checkout.session.expired', order)));
    const before = await stockOf(variantA);

    const response = await POST(signed(eventPayload('checkout.session.completed', order)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'lateOrUnknown' });
    expect(await orderStatus(order)).toBe('cancelado');
    expect(await stockOf(variantA)).toBe(before);
  });

  it('un pedido inexistente se responde 200 para que Stripe no reintente', async () => {
    const response = await POST(signed(eventPayload('checkout.session.completed', randomUUID())));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'lateOrUnknown' });
  });

  it('un evento de otro tipo se ignora con 200', async () => {
    const response = await POST(signed(eventPayload('customer.created', randomUUID())));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: 'ignored' });
  });
});

describe('permisos', () => {
  it('un cliente autenticado o anónimo no puede ejecutar la función ni leer los eventos', async () => {
    const order = await pendingOrder([{ variantId: variantB, qty: 1 }]);
    const args = { p_order_id: order, p_event_id: `evt_test_${randomUUID()}` };
    expect((await user.client.rpc('confirm_order_payment', args)).error).not.toBeNull();
    expect((await anonymousClient().rpc('confirm_order_payment', args)).error).not.toBeNull();
    expect(await orderStatus(order)).toBe('pendiente');

    const read = await user.client.from('stripe_events').select('event_id');
    expect(read.error !== null || (read.data ?? []).length === 0).toBe(true);
  });
});
