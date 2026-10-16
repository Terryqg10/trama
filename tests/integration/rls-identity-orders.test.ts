import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  idRowsSchema,
  sampleAddress,
  sampleShippingAddress,
  serviceClient,
  type TestUser,
} from './helpers';

const orderRowsSchema = z.array(z.object({ id: z.string(), status: z.string() }));
const profileRowsSchema = z.array(z.object({ id: z.string(), role: z.string() }));

let admin: SupabaseClient;
let userA: TestUser;
let userB: TestUser;
let orderAId: string;
let orderBId: string;
let addressBId: string;

async function insertOrder(userId: string): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({
      user_id: userId,
      total_cents: 5990,
      shipping_cents: 495,
      shipping_address: sampleShippingAddress,
    })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`insertOrder: ${inserted.error.message}`);
  const parsed = z.object({ id: z.string() }).parse(inserted.data);

  const item = await admin.from('order_items').insert({
    order_id: parsed.id,
    variant_id: crypto.randomUUID(),
    product_name: 'Polo de prueba',
    size: 'M',
    color: 'azul',
    qty: 1,
    unit_price_cents: 5495,
  });
  if (item.error) throw new Error(`insertOrderItem: ${item.error.message}`);
  return parsed.id;
}

beforeAll(async () => {
  admin = serviceClient();
  userA = await createTestUser(admin, 'a');
  userB = await createTestUser(admin, 'b');

  orderAId = await insertOrder(userA.id);
  orderBId = await insertOrder(userB.id);

  const addr = await admin
    .from('addresses')
    .insert({ user_id: userB.id, ...sampleAddress })
    .select('id')
    .single();
  if (addr.error) throw new Error(`insert address B: ${addr.error.message}`);
  addressBId = z.object({ id: z.string() }).parse(addr.data).id;
});

afterAll(async () => {
  // Si beforeAll falló antes de crear el cliente, no hay nada que limpiar.
  if (!admin) return;
  // Limpieza: los pedidos quedan huérfanos (user_id null) al borrar al usuario.
  await admin.from('orders').delete().in('id', [orderAId, orderBId].filter(Boolean));
  if (userA) await deleteTestUser(admin, userA.id);
  if (userB) await deleteTestUser(admin, userB.id);
});

describe('orders: aislamiento entre usuarios (CA-14)', () => {
  it('A solo ve sus pedidos y nunca aparece el de B', async () => {
    const result = await userA.client.from('orders').select('id');
    expect(result.error).toBeNull();
    const ids = idRowsSchema.parse(result.data).map((r) => r.id);
    expect(ids).toContain(orderAId);
    expect(ids).not.toContain(orderBId);
  });

  it('B solo ve sus pedidos y nunca aparece el de A', async () => {
    const result = await userB.client.from('orders').select('id');
    expect(result.error).toBeNull();
    const ids = idRowsSchema.parse(result.data).map((r) => r.id);
    expect(ids).toContain(orderBId);
    expect(ids).not.toContain(orderAId);
  });

  it('A no puede leer directamente el pedido de B por id', async () => {
    const result = await userA.client.from('orders').select('id').eq('id', orderBId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('A no ve las líneas del pedido de B', async () => {
    const result = await userA.client.from('order_items').select('id').eq('order_id', orderBId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('A sí ve las líneas de su propio pedido', async () => {
    const result = await userA.client.from('order_items').select('id').eq('order_id', orderAId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('un usuario anónimo no obtiene pedidos', async () => {
    const result = await anonymousClient().from('orders').select('id');
    const rows = result.error ? [] : idRowsSchema.parse(result.data);
    expect(rows).toHaveLength(0);
  });

  it('un usuario anónimo no obtiene líneas de pedido', async () => {
    const result = await anonymousClient().from('order_items').select('id');
    const rows = result.error ? [] : idRowsSchema.parse(result.data);
    expect(rows).toHaveLength(0);
  });
});

describe('orders: escrituras denegadas al cliente', () => {
  it('un cliente no puede insertar pedidos (el servidor calcula los importes)', async () => {
    const result = await userA.client.from('orders').insert({
      user_id: userA.id,
      total_cents: 1,
      shipping_cents: 0,
      shipping_address: sampleShippingAddress,
    });
    expect(result.error).not.toBeNull();
  });

  it('un cliente no puede cambiar el estado de su propio pedido', async () => {
    await userA.client.from('orders').update({ status: 'entregado' }).eq('id', orderAId);
    const check = await admin.from('orders').select('id, status').eq('id', orderAId);
    expect(orderRowsSchema.parse(check.data)[0]?.status).toBe('pendiente');
  });

  it('A no puede cambiar el estado del pedido de B', async () => {
    await userA.client.from('orders').update({ status: 'cancelado' }).eq('id', orderBId);
    const check = await admin.from('orders').select('id, status').eq('id', orderBId);
    expect(orderRowsSchema.parse(check.data)[0]?.status).toBe('pendiente');
  });

  it('un cliente no puede borrar pedidos', async () => {
    await userA.client.from('orders').delete().eq('id', orderAId);
    const check = await admin.from('orders').select('id').eq('id', orderAId);
    expect(idRowsSchema.parse(check.data)).toHaveLength(1);
  });

  it('un cliente no puede insertar líneas de pedido', async () => {
    const result = await userA.client.from('order_items').insert({
      order_id: orderAId,
      variant_id: crypto.randomUUID(),
      product_name: 'Intruso',
      size: 'M',
      color: 'rojo',
      qty: 1,
      unit_price_cents: 1,
    });
    expect(result.error).not.toBeNull();
  });
});

describe('profiles: el rol no es editable por el cliente', () => {
  it('un cliente no puede subirse a admin', async () => {
    const attempt = await userA.client.from('profiles').update({ role: 'admin' }).eq('id', userA.id);
    expect(attempt.error).not.toBeNull();
    const check = await admin.from('profiles').select('id, role').eq('id', userA.id);
    expect(profileRowsSchema.parse(check.data)[0]?.role).toBe('customer');
  });

  it('un cliente sí puede editar su nombre', async () => {
    const attempt = await userA.client
      .from('profiles')
      .update({ full_name: 'Nombre editado' })
      .eq('id', userA.id);
    expect(attempt.error).toBeNull();
  });

  it('A no ve el perfil de B', async () => {
    const result = await userA.client.from('profiles').select('id').eq('id', userB.id);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });
});

describe('addresses: aislamiento entre usuarios', () => {
  it('A no ve las direcciones de B', async () => {
    const result = await userA.client.from('addresses').select('id');
    expect(result.error).toBeNull();
    const ids = idRowsSchema.parse(result.data).map((r) => r.id);
    expect(ids).not.toContain(addressBId);
  });

  it('A no puede crear una dirección a nombre de B', async () => {
    const result = await userA.client
      .from('addresses')
      .insert({ user_id: userB.id, ...sampleAddress });
    expect(result.error).not.toBeNull();
  });

  it('A no puede modificar ni borrar la dirección de B', async () => {
    await userA.client.from('addresses').update({ city: 'Hackeada' }).eq('id', addressBId);
    await userA.client.from('addresses').delete().eq('id', addressBId);
    const check = await admin.from('addresses').select('id, city').eq('id', addressBId);
    const rows = z.array(z.object({ id: z.string(), city: z.string() })).parse(check.data);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.city).toBe('Madrid');
  });

  it('A puede crear, editar y borrar sus propias direcciones', async () => {
    const created = await userA.client
      .from('addresses')
      .insert({ user_id: userA.id, ...sampleAddress })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    const id = z.object({ id: z.string() }).parse(created.data).id;

    const updated = await userA.client.from('addresses').update({ city: 'Sevilla' }).eq('id', id);
    expect(updated.error).toBeNull();

    const removed = await userA.client.from('addresses').delete().eq('id', id);
    expect(removed.error).toBeNull();
  });

  it('rechaza un código postal inválido', async () => {
    const result = await userA.client
      .from('addresses')
      .insert({ user_id: userA.id, ...sampleAddress, postal_code: 'ABCDE' });
    expect(result.error).not.toBeNull();
  });

  it('un usuario anónimo no obtiene direcciones', async () => {
    const result = await anonymousClient().from('addresses').select('id');
    const rows = result.error ? [] : idRowsSchema.parse(result.data);
    expect(rows).toHaveLength(0);
  });
});

describe('stripe_events: solo servidor', () => {
  it('un cliente no puede leer eventos', async () => {
    const result = await userA.client.from('stripe_events').select('event_id');
    const rows = result.error ? [] : z.array(z.object({ event_id: z.string() })).parse(result.data);
    expect(rows).toHaveLength(0);
  });

  it('un cliente no puede insertar eventos', async () => {
    const result = await userA.client.from('stripe_events').insert({ event_id: `evt_${crypto.randomUUID()}` });
    expect(result.error).not.toBeNull();
  });
});
