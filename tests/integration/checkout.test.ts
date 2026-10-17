import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { saveAccountCart } from '../../src/lib/cart/account';
import { checkoutInputSchema, createCheckout } from '../../src/lib/checkout/create-checkout';
import type { Database } from '../../src/lib/db/types.generated';
import { createStripeClient } from '../../src/lib/stripe/client';
import { createTestUser, deleteTestUser, idRowsSchema, sampleAddress, serviceClient, type TestUser } from './helpers';

// T-032: checkout (CA-09, CA-10) contra la BD real y la API de Stripe en MODO TEST. Se crean sesiones
// de pago reales de prueba (no se cobra nada y caducan solas).

type Client = SupabaseClient<Database>;
const idSchema = z.object({ id: z.string() });
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

const stripe = createStripeClient({ STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] });

let admin: SupabaseClient;
let user: TestUser;
let other: TestUser;
let productId = '';
let addressId = '';
let otherAddressId = '';
const variant = { cheap: '', second: '', scarce: '' };
const orderIds: string[] = [];

const asClient = (u: TestUser): Client => u.client;
const origin = 'http://localhost:3000';

async function createVariant(size: string, price: number, stock: number): Promise<string> {
  const inserted = await admin
    .from('product_variants')
    .insert({ product_id: productId, size, color: TAG, price_cents: price, stock })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createVariant: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

async function createAddress(owner: TestUser): Promise<string> {
  const inserted = await owner.client.from('addresses').insert({ user_id: owner.id, ...sampleAddress }).select('id').single();
  if (inserted.error) throw new Error(`createAddress: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

async function checkout(forUser: TestUser, address: string) {
  const result = await createCheckout(
    { userClient: asClient(forUser), serviceClient: admin, stripe },
    { userId: forUser.id, email: null, addressId: address, origin },
  );
  if (result.status === 'redirect') orderIds.push(result.orderId);
  return result;
}

beforeAll(async () => {
  admin = serviceClient();
  user = await createTestUser(admin, 'checkout');
  other = await createTestUser(admin, 'checkout-otro');
  const product = await admin
    .from('products')
    .insert({
      slug: `t032-${randomUUID().slice(0, 8)}`,
      name: 'Producto T-032',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  productId = idSchema.parse(product.data).id;
  variant.cheap = await createVariant('S', 1995, 10);
  variant.second = await createVariant('M', 1000, 10);
  variant.scarce = await createVariant('L', 3000, 1);
  addressId = await createAddress(user);
  otherAddressId = await createAddress(other);
});

afterAll(async () => {
  if (!admin) return;
  // Las filas de pedido y de reserva se borran en cascada con el pedido.
  const mine = await admin.from('orders').select('id').in('user_id', [user?.id ?? '', other?.id ?? '']);
  const ids = [...orderIds, ...idRowsSchema.parse(mine.data ?? []).map((row) => row.id)];
  if (ids.length > 0) await admin.from('orders').delete().in('id', ids);
  if (productId) await admin.from('products').delete().eq('id', productId);
  if (user) await deleteTestUser(admin, user.id);
  if (other) await deleteTestUser(admin, other.id);
});

describe('checkout-amounts (CA-09)', () => {
  it('crea la sesión de pago de Stripe con los importes calculados por el servidor', async () => {
    await saveAccountCart(asClient(user), user.id, [
      { variantId: variant.cheap, qty: 2 }, // 2 × 19,95 = 39,90 €
      { variantId: variant.second, qty: 1 }, // 10,00 €
    ]);

    const result = await checkout(user, addressId);
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    expect(result.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    // Pedido pendiente con importes de la BD: 49,90 € de prenda + 4,95 € de envío (por debajo de 50 €).
    const order = await admin.from('orders').select('status, total_cents, shipping_cents, stripe_session_id, shipping_address').eq('id', result.orderId).single();
    expect(order.data).toMatchObject({ status: 'pendiente', total_cents: 5485, shipping_cents: 495 });
    expect(order.data?.shipping_address).toMatchObject({ postal_code: sampleAddress.postal_code, country: 'ES' });

    const items = await admin.from('order_items').select('variant_id, qty, unit_price_cents').eq('order_id', result.orderId);
    expect(items.data).toEqual(
      expect.arrayContaining([
        { variant_id: variant.cheap, qty: 2, unit_price_cents: 1995 },
        { variant_id: variant.second, qty: 1, unit_price_cents: 1000 },
      ]),
    );

    // Y la sesión de Stripe lleva exactamente esos importes.
    const sessionId = z.object({ stripe_session_id: z.string() }).parse(order.data).stripe_session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    expect(session.amount_total).toBe(5485);
    expect(session.currency).toBe('eur');
    expect(session.client_reference_id).toBe(result.orderId);
    expect(session.metadata).toMatchObject({ order_id: result.orderId });

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    expect(lineItems.data.map((item) => [item.quantity, item.price?.unit_amount]).sort()).toEqual([
      [1, 1000],
      [2, 1995],
    ]);

    // La reserva de stock queda activa.
    const reservations = await admin.from('stock_reservations').select('variant_id, qty, status').eq('order_id', result.orderId);
    expect(reservations.data).toEqual(
      expect.arrayContaining([
        { variant_id: variant.cheap, qty: 2, status: 'activa' },
        { variant_id: variant.second, qty: 1, status: 'activa' },
      ]),
    );
  });

  it('con un total de 50 € o más el envío es gratis', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.cheap, qty: 3 }]); // 59,85 €
    const result = await checkout(user, addressId);
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;
    const order = await admin.from('orders').select('total_cents, shipping_cents').eq('id', result.orderId).single();
    expect(order.data).toEqual({ total_cents: 5985, shipping_cents: 0 });
  });
});

describe('checkout-price-tamper (CA-10)', () => {
  it('ignora el precio y los totales que el cliente añada a la petición', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.cheap, qty: 1 }]);

    // Lo que llega del navegador, con campos que no deberían existir.
    const tampered = {
      addressId,
      price: 1,
      unitPriceCents: 1,
      total_cents: 1,
      totalCents: 1,
      amount: 1,
      items: [{ variantId: variant.cheap, qty: 1, priceCents: 1 }],
    };
    const input = checkoutInputSchema.parse(tampered);
    expect(input).toEqual({ addressId });

    const result = await checkout(user, input.addressId);
    expect(result.status).toBe('redirect');
    if (result.status !== 'redirect') return;

    const order = await admin.from('orders').select('total_cents, shipping_cents, stripe_session_id').eq('id', result.orderId).single();
    expect(order.data).toMatchObject({ total_cents: 1995 + 495, shipping_cents: 495 });
    const sessionId = z.object({ stripe_session_id: z.string() }).parse(order.data).stripe_session_id;
    expect((await stripe.checkout.sessions.retrieve(sessionId)).amount_total).toBe(1995 + 495);
  });
});

describe('repetir el checkout y fallos de Stripe (falla cerrado)', () => {
  it('un nuevo intento cancela el pedido pendiente anterior y libera su reserva', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.second, qty: 1 }]);
    const first = await checkout(user, addressId);
    const second = await checkout(user, addressId);
    expect(first.status).toBe('redirect');
    expect(second.status).toBe('redirect');
    if (first.status !== 'redirect' || second.status !== 'redirect') return;

    const firstOrder = await admin.from('orders').select('status').eq('id', first.orderId).single();
    expect(firstOrder.data).toEqual({ status: 'cancelado' });
    const firstReservations = await admin.from('stock_reservations').select('status').eq('order_id', first.orderId);
    expect(firstReservations.data).toEqual([{ status: 'liberada' }]);
    const secondOrder = await admin.from('orders').select('status').eq('id', second.orderId).single();
    expect(secondOrder.data).toEqual({ status: 'pendiente' });
  });

  it('si Stripe falla, el pedido queda cancelado, la reserva liberada y no se devuelve ninguna URL', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.second, qty: 1 }]);
    // Clave de test inválida: Stripe rechaza la petición y el checkout debe fallar cerrado.
    const broken = createStripeClient({ STRIPE_SECRET_KEY: 'sk_test_clave_invalida' });
    const result = await createCheckout(
      { userClient: asClient(user), serviceClient: admin, stripe: broken },
      { userId: user.id, email: null, addressId, origin },
    );
    expect(result).toEqual({ status: 'error' });

    const orders = await admin.from('orders').select('id, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    const latest = z.array(z.object({ id: z.string(), status: z.string() })).parse(orders.data)[0];
    expect(latest?.status).toBe('cancelado');
    const reservations = await admin.from('stock_reservations').select('status').eq('order_id', latest?.id ?? '');
    expect(reservations.data).toEqual([{ status: 'liberada' }]);
  });
});

describe('casos límite del checkout', () => {
  it('con el carrito vacío no crea ningún pedido', async () => {
    await saveAccountCart(asClient(user), user.id, []);
    const before = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    expect(await checkout(user, addressId)).toEqual({ status: 'empty' });
    const after = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    expect(after.count).toBe(before.count);
  });

  it('una dirección ajena se rechaza', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.cheap, qty: 1 }]);
    expect(await checkout(user, otherAddressId)).toEqual({ status: 'invalidAddress' });
    expect(await checkout(user, randomUUID())).toEqual({ status: 'invalidAddress' });
  });

  it('con una cantidad por encima del stock se bloquea, indica la variante y no crea pedido', async () => {
    // El carrito de la cuenta se guarda recortado; se fuerza por la tabla para simular stock que bajó.
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.scarce, qty: 1 }]);
    const cart = await admin.from('carts').select('id').eq('user_id', user.id).single();
    await admin.from('cart_items').update({ qty: 3 }).eq('cart_id', idSchema.parse(cart.data).id);

    const before = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    const result = await checkout(user, addressId);
    expect(result).toMatchObject({
      status: 'blocked',
      issues: [{ kind: 'insufficientStock', variantId: variant.scarce, requested: 3, available: 1 }],
    });
    const after = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    expect(after.count).toBe(before.count);
  });

  it('si otro comprador se llevó la última unidad entre medias, se cancela el pedido y se avisa', async () => {
    await saveAccountCart(asClient(user), user.id, [{ variantId: variant.scarce, qty: 1 }]);
    // Otro pedido reserva la última unidad.
    const rival = await admin
      .from('orders')
      .insert({ user_id: other.id, total_cents: 3000, shipping_cents: 495, shipping_address: { country: 'ES' } })
      .select('id')
      .single();
    const rivalId = idSchema.parse(rival.data).id;
    await admin.rpc('reserve_stock', { p_order_id: rivalId, p_lines: [{ variant_id: variant.scarce, qty: 1 }] });

    const result = await checkout(user, addressId);
    expect(result).toMatchObject({
      status: 'blocked',
      issues: [{ kind: 'insufficientStock', variantId: variant.scarce, available: 0 }],
    });
    const orders = await admin.from('orders').select('status').eq('user_id', user.id).eq('status', 'cancelado');
    expect((orders.data ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
