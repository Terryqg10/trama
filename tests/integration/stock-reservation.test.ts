import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  releaseExpiredReservations,
  releaseOrderReservations,
  reserveStock,
} from '../../src/lib/checkout/reservation';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  sampleShippingAddress,
  serviceClient,
  type TestUser,
} from './helpers';

// T-019: reserva de stock atómica (CA-18, CA-19). Necesita aplicada la migración
// `20261017000000_stock_reservation.sql` en la base de datos de pruebas.

const idSchema = z.object({ id: z.string() });
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

let admin: SupabaseClient;
let user: TestUser;
let productId = '';
const orderIds: string[] = [];
const variant: Record<'one' | 'five' | 'three' | 'extra', string> = { one: '', five: '', three: '', extra: '' };

async function createVariant(size: string, stock: number): Promise<string> {
  const inserted = await admin
    .from('product_variants')
    .insert({ product_id: productId, size, color: TAG, price_cents: 1000, stock })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createVariant: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

async function createOrder(): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({ user_id: user.id, total_cents: 1000, shipping_cents: 495, shipping_address: sampleShippingAddress })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createOrder: ${inserted.error.message}`);
  const id = idSchema.parse(inserted.data).id;
  orderIds.push(id);
  return id;
}

async function reservationRows(orderId: string): Promise<Array<{ variant_id: string; qty: number; status: string }>> {
  const rows = await admin.from('stock_reservations').select('variant_id, qty, status').eq('order_id', orderId);
  return z.array(z.object({ variant_id: z.string(), qty: z.number(), status: z.string() })).parse(rows.data);
}

async function orderStatus(orderId: string): Promise<string> {
  const row = await admin.from('orders').select('status').eq('id', orderId).single();
  return z.object({ status: z.string() }).parse(row.data).status;
}

beforeAll(async () => {
  admin = serviceClient();
  user = await createTestUser(admin, 'reserva');
  const product = await admin
    .from('products')
    .insert({
      slug: `t019-${randomUUID().slice(0, 8)}`,
      name: 'Producto T-019',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  productId = idSchema.parse(product.data).id;
  variant.one = await createVariant('S', 1);
  variant.five = await createVariant('M', 5);
  variant.three = await createVariant('L', 3);
  variant.extra = await createVariant('XL', 4);
});

afterAll(async () => {
  if (!admin) return;
  if (orderIds.length > 0) await admin.from('orders').delete().in('id', orderIds);
  if (productId) await admin.from('products').delete().eq('id', productId);
  if (user) await deleteTestUser(admin, user.id);
});

describe('reserve-last-unit (CA-18)', () => {
  it('con una sola unidad y dos compradores a la vez, solo uno obtiene la reserva', async () => {
    const [a, b] = [await createOrder(), await createOrder()];

    const results = await Promise.all([
      reserveStock(admin, a, [{ variantId: variant.one, qty: 1 }]),
      reserveStock(admin, b, [{ variantId: variant.one, qty: 1 }]),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const loser = results.find((result) => !result.ok);
    expect(loser).toMatchObject({ ok: false, reason: 'insufficient_stock' });
    expect(loser && !loser.ok ? loser.shortages : []).toEqual([
      { variantId: variant.one, requested: 1, available: 0 },
    ]);

    const rows = [...(await reservationRows(a)), ...(await reservationRows(b))];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ variant_id: variant.one, qty: 1, status: 'activa' });
  });

  it('muchos compradores a la vez nunca reservan más que el stock', async () => {
    const orders = await Promise.all(Array.from({ length: 6 }, () => createOrder()));
    const results = await Promise.all(
      orders.map((order) => reserveStock(admin, order, [{ variantId: variant.extra, qty: 1 }])),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(4);
    expect(results.filter((result) => !result.ok)).toHaveLength(2);
  });
});

describe('todo o nada', () => {
  it('si una línea no cabe no se reserva ninguna y el resto del stock queda libre', async () => {
    const order = await createOrder();
    const result = await reserveStock(admin, order, [
      { variantId: variant.five, qty: 2 },
      { variantId: variant.one, qty: 1 }, // ya agotada por el test anterior
    ]);
    expect(result).toMatchObject({ ok: false, reason: 'insufficient_stock' });
    expect(await reservationRows(order)).toEqual([]);

    const other = await createOrder();
    const full = await reserveStock(admin, other, [{ variantId: variant.five, qty: 5 }]);
    expect(full.ok).toBe(true);
  });

  it('las líneas repetidas de una variante se suman antes de comprobar el stock', async () => {
    const order = await createOrder();
    const result = await reserveStock(admin, order, [
      { variantId: variant.three, qty: 2 },
      { variantId: variant.three, qty: 2 },
    ]);
    expect(result).toMatchObject({
      ok: false,
      reason: 'insufficient_stock',
      shortages: [{ variantId: variant.three, requested: 4, available: 3 }],
    });
  });

  it('una variante inexistente cuenta como falta', async () => {
    const order = await createOrder();
    const missing = randomUUID();
    const result = await reserveStock(admin, order, [{ variantId: missing, qty: 1 }]);
    expect(result).toMatchObject({
      ok: false,
      reason: 'insufficient_stock',
      shortages: [{ variantId: missing, requested: 1, available: 0 }],
    });
  });
});

describe('estado del pedido', () => {
  it('no se reserva dos veces para el mismo pedido', async () => {
    const order = await createOrder();
    expect((await reserveStock(admin, order, [{ variantId: variant.three, qty: 1 }])).ok).toBe(true);
    expect(await reserveStock(admin, order, [{ variantId: variant.three, qty: 1 }])).toMatchObject({
      ok: false,
      reason: 'already_reserved',
    });
  });

  it('un pedido que no está pendiente no puede reservar', async () => {
    const order = await createOrder();
    await admin.from('orders').update({ status: 'cancelado' }).eq('id', order);
    expect(await reserveStock(admin, order, [{ variantId: variant.three, qty: 1 }])).toMatchObject({
      ok: false,
      reason: 'order_not_pending',
    });
  });

  it('liberar las reservas de un pedido lo cancela y devuelve el stock', async () => {
    const order = await createOrder();
    expect((await reserveStock(admin, order, [{ variantId: variant.three, qty: 2 }])).ok).toBe(true);

    expect(await releaseOrderReservations(admin, order)).toBe(1);
    expect(await orderStatus(order)).toBe('cancelado');
    expect((await reservationRows(order))[0]?.status).toBe('liberada');

    const next = await createOrder();
    expect((await reserveStock(admin, next, [{ variantId: variant.three, qty: 2 }])).ok).toBe(true);
  });
});

describe('reserve-expiry (CA-19)', () => {
  it('una reserva vencida se libera, su pedido pasa a cancelado y el stock vuelve a estar disponible', async () => {
    const stale = await createOrder();
    // Variante propia para no depender de lo que reservaron los otros tests.
    const own = await createVariant('XXL', 2);
    expect((await reserveStock(admin, stale, [{ variantId: own, qty: 2 }])).ok).toBe(true);

    const buyer = await createOrder();
    expect(await reserveStock(admin, buyer, [{ variantId: own, qty: 1 }])).toMatchObject({
      ok: false,
      reason: 'insufficient_stock',
    });

    // Pasa el tiempo límite.
    const expired = await admin
      .from('stock_reservations')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('order_id', stale);
    expect(expired.error).toBeNull();

    expect(await releaseExpiredReservations(admin)).toBeGreaterThanOrEqual(1);
    expect((await reservationRows(stale))[0]?.status).toBe('liberada');
    expect(await orderStatus(stale)).toBe('cancelado');

    expect((await reserveStock(admin, buyer, [{ variantId: own, qty: 2 }])).ok).toBe(true);
  });

  it('una reserva vencida deja de bloquear el stock aunque nadie la haya liberado todavía', async () => {
    const own = await createVariant('3XL', 1);
    const stale = await createOrder();
    expect((await reserveStock(admin, stale, [{ variantId: own, qty: 1 }])).ok).toBe(true);
    await admin
      .from('stock_reservations')
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq('order_id', stale);

    const buyer = await createOrder();
    expect((await reserveStock(admin, buyer, [{ variantId: own, qty: 1 }])).ok).toBe(true);
    expect(await orderStatus(stale)).toBe('cancelado');
  });
});

describe('permisos de las funciones', () => {
  const lines = (id: string) => [{ variant_id: id, qty: 1 }];

  it('un cliente autenticado no puede ejecutarlas', async () => {
    const order = await createOrder();
    const reserve = await user.client.rpc('reserve_stock', { p_order_id: order, p_lines: lines(variant.three) });
    expect(reserve.error).not.toBeNull();
    const release = await user.client.rpc('release_expired_reservations');
    expect(release.error).not.toBeNull();
    const cancel = await user.client.rpc('release_order_reservations', { p_order_id: order });
    expect(cancel.error).not.toBeNull();
  });

  it('un cliente anónimo tampoco', async () => {
    const order = await createOrder();
    const anon = anonymousClient();
    expect((await anon.rpc('reserve_stock', { p_order_id: order, p_lines: lines(variant.three) })).error).not.toBeNull();
    expect((await anon.rpc('release_expired_reservations')).error).not.toBeNull();
  });

  it('las líneas inválidas se rechazan sin tocar nada', async () => {
    const order = await createOrder();
    for (const bad of [[], [{ variant_id: 'no-uuid', qty: 1 }], [{ variant_id: variant.three, qty: 0 }]]) {
      const { data } = await admin.rpc('reserve_stock', { p_order_id: order, p_lines: bad });
      expect(data).toMatchObject({ ok: false, reason: 'invalid_lines' });
    }
    expect(await reservationRows(order)).toEqual([]);
  });
});
