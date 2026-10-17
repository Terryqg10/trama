import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { Database } from '../../src/lib/db/types.generated';
import { changeOrderStatus, listAdminOrders } from '../../src/lib/orders/admin';
import {
  createTestUser,
  deleteTestUser,
  promoteToAdmin,
  sampleShippingAddress,
  serviceClient,
  type TestUser,
} from './helpers';

// T-022 (CA-17): el cambio de estado de pedidos desde el panel. La máquina de estados la valida el servidor y la
// RLS impide que un no admin cambie nada, aunque llame a la función directamente.

type Client = SupabaseClient<Database>;
const idSchema = z.object({ id: z.string() });

let admin: SupabaseClient;
let adminUser: TestUser;
let customer: TestUser;
const orderIds: string[] = [];

const asClient = (user: TestUser): Client => user.client;

async function createOrder(userId: string, status: string): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({ user_id: userId, status, total_cents: 3485, shipping_cents: 495, shipping_address: sampleShippingAddress })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createOrder: ${inserted.error.message}`);
  const id = idSchema.parse(inserted.data).id;
  orderIds.push(id);
  return id;
}

async function statusOf(orderId: string): Promise<string> {
  const row = await admin.from('orders').select('status').eq('id', orderId).single();
  return z.object({ status: z.string() }).parse(row.data).status;
}

beforeAll(async () => {
  admin = serviceClient();
  adminUser = await createTestUser(admin, 'panel-admin');
  await promoteToAdmin(admin, adminUser.id);
  // El cliente ya autenticado tiene la sesión de antes de ser admin: se vuelve a iniciar para leer el rol nuevo.
  customer = await createTestUser(admin, 'panel-cliente');
});

afterAll(async () => {
  if (!admin) return;
  if (orderIds.length > 0) await admin.from('orders').delete().in('id', orderIds);
  if (adminUser) await deleteTestUser(admin, adminUser.id);
  if (customer) await deleteTestUser(admin, customer.id);
});

describe('changeOrderStatus (CA-17)', () => {
  it('el admin avanza un pedido por la máquina de estados', async () => {
    const order = await createOrder(customer.id, 'pagado');
    expect(await changeOrderStatus(asClient(adminUser), order, 'preparado')).toEqual({ status: 'ok', from: 'pagado', to: 'preparado' });
    expect(await changeOrderStatus(asClient(adminUser), order, 'enviado')).toEqual({ status: 'ok', from: 'preparado', to: 'enviado' });
    expect(await changeOrderStatus(asClient(adminUser), order, 'entregado')).toEqual({ status: 'ok', from: 'enviado', to: 'entregado' });
    expect(await statusOf(order)).toBe('entregado');
  });

  it('un pedido entregado no puede volver a pagado: transición rechazada y sin cambios', async () => {
    const order = await createOrder(customer.id, 'entregado');
    expect(await changeOrderStatus(asClient(adminUser), order, 'pagado')).toEqual({
      status: 'invalidTransition',
      from: 'entregado',
      to: 'pagado',
    });
    expect(await statusOf(order)).toBe('entregado');
  });

  it('el admin no puede saltarse estados ni confirmar un pago a mano', async () => {
    const paid = await createOrder(customer.id, 'pagado');
    expect(await changeOrderStatus(asClient(adminUser), paid, 'entregado')).toMatchObject({ status: 'invalidTransition' });
    const pending = await createOrder(customer.id, 'pendiente');
    expect(await changeOrderStatus(asClient(adminUser), pending, 'pagado')).toMatchObject({ status: 'invalidTransition' });
    expect(await statusOf(paid)).toBe('pagado');
    expect(await statusOf(pending)).toBe('pendiente');
  });

  it('un pedido inexistente o un id inválido devuelven notFound', async () => {
    expect(await changeOrderStatus(asClient(adminUser), randomUUID(), 'preparado')).toEqual({ status: 'notFound' });
    expect(await changeOrderStatus(asClient(adminUser), 'no-uuid', 'preparado')).toEqual({ status: 'notFound' });
  });

  it('la actualización condicionada impide pisar un cambio concurrente', async () => {
    const order = await createOrder(customer.id, 'pagado');
    // Dos admins leen «pagado» a la vez; el primero lo pasa a «preparado» y el segundo a «cancelado».
    const [first, second] = await Promise.all([
      changeOrderStatus(asClient(adminUser), order, 'preparado'),
      changeOrderStatus(asClient(adminUser), order, 'cancelado'),
    ]);
    const outcomes = [first.status, second.status].sort();
    expect(outcomes).toEqual(['conflict', 'ok']);
    expect(['preparado', 'cancelado']).toContain(await statusOf(order));
  });
});

describe('permisos (RLS)', () => {
  it('un cliente no admin no puede cambiar el estado ni de su propio pedido', async () => {
    const order = await createOrder(customer.id, 'pagado');
    const result = await changeOrderStatus(asClient(customer), order, 'preparado');
    // La transición es válida para la máquina, pero la RLS no deja escribir: no hay filas actualizadas.
    expect(result.status).toBe('conflict');
    expect(await statusOf(order)).toBe('pagado');

    const direct = await customer.client.from('orders').update({ status: 'entregado' }).eq('id', order).select('id');
    expect(direct.data ?? []).toEqual([]);
    expect(await statusOf(order)).toBe('pagado');
  });
});

describe('listAdminOrders', () => {
  it('el admin ve pedidos de otros clientes y un cliente solo los suyos', async () => {
    const mine = await createOrder(customer.id, 'pagado');
    const other = await createOrder(adminUser.id, 'enviado');

    const asAdmin = (await listAdminOrders(asClient(adminUser))).map((order) => order.id);
    expect(asAdmin).toEqual(expect.arrayContaining([mine, other]));

    const asCustomer = (await listAdminOrders(asClient(customer))).map((order) => order.id);
    expect(asCustomer).toContain(mine);
    expect(asCustomer).not.toContain(other);
  });

  it('filtra por estado', async () => {
    const shipped = await createOrder(customer.id, 'enviado');
    const list = await listAdminOrders(asClient(adminUser), 'enviado');
    expect(list.map((order) => order.id)).toContain(shipped);
    expect(list.every((order) => order.status === 'enviado')).toBe(true);
  });
});
