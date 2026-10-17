import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Database } from '../../src/lib/db/types.generated';
import { getOrder, listOrders } from '../../src/lib/orders/orders';
import { createTestUser, deleteTestUser, sampleShippingAddress, serviceClient, type TestUser } from './helpers';

// T-020 (CA-14): la consulta del historial usa la sesión del cliente y la RLS limita las filas a su dueño.

type Client = SupabaseClient<Database>;
const idSchema = z.object({ id: z.string() });

let admin: SupabaseClient;
let userA: TestUser;
let userB: TestUser;
let orderA = '';
let orderB = '';

const asClient = (user: TestUser): Client => user.client;

async function createOrder(userId: string, status: string): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({ user_id: userId, status, total_cents: 3485, shipping_cents: 495, shipping_address: sampleShippingAddress })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createOrder: ${inserted.error.message}`);
  const id = idSchema.parse(inserted.data).id;
  const item = await admin.from('order_items').insert({
    order_id: id,
    variant_id: randomUUID(),
    product_name: 'Polo de prueba',
    size: 'M',
    color: 'azul',
    qty: 1,
    unit_price_cents: 2990,
  });
  if (item.error) throw new Error(`createOrderItem: ${item.error.message}`);
  return id;
}

beforeAll(async () => {
  admin = serviceClient();
  userA = await createTestUser(admin, 'historial-a');
  userB = await createTestUser(admin, 'historial-b');
  orderA = await createOrder(userA.id, 'pagado');
  orderB = await createOrder(userB.id, 'enviado');
});

afterAll(async () => {
  if (!admin) return;
  await admin.from('orders').delete().in('id', [orderA, orderB].filter((id) => id !== ''));
  if (userA) await deleteTestUser(admin, userA.id);
  if (userB) await deleteTestUser(admin, userB.id);
});

describe('historial de pedidos (CA-14, test orders-isolation)', () => {
  it('A lista solo sus pedidos y B no aparece', async () => {
    const orders = await listOrders(asClient(userA), userA.id);
    expect(orders.map((order) => order.id)).toEqual([orderA]);
    expect(orders[0]).toMatchObject({ status: 'pagado', totalCents: 3485, shippingCents: 495 });
  });

  it('aunque se pida el id de otro usuario, la RLS no devuelve filas', async () => {
    expect(await listOrders(asClient(userA), userB.id)).toEqual([]);
    expect(await getOrder(asClient(userA), userB.id, orderB)).toBeNull();
    expect(await getOrder(asClient(userA), userA.id, orderB)).toBeNull();
  });

  it('el detalle propio incluye líneas y dirección, y un id inválido da null', async () => {
    const detail = await getOrder(asClient(userA), userA.id, orderA);
    expect(detail).toMatchObject({
      id: orderA,
      status: 'pagado',
      address: { postal_code: sampleShippingAddress.postal_code, country: 'ES' },
    });
    expect(detail?.items).toEqual([
      expect.objectContaining({ productName: 'Polo de prueba', size: 'M', color: 'azul', qty: 1, unitPriceCents: 2990 }),
    ]);
    expect(await getOrder(asClient(userA), userA.id, 'no-uuid')).toBeNull();
  });
});
