import { z } from 'zod';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { ORDER_STATUSES, type OrderStatus } from './orders';
import { canTransition } from './transitions';

/**
 * Pedidos desde el panel admin (RF-10, CA-17). Todas las consultas usan el cliente con la sesión del
 * admin: las políticas RLS de `orders` y `order_items` le dejan leer todos los pedidos y cambiar solo el
 * estado. La máquina de estados la valida el servidor; la RLS es la barrera final.
 */

export const MAX_ADMIN_ORDERS = 100;

const adminOrderRowSchema = z.object({
  id: z.string(),
  status: z.enum(ORDER_STATUSES),
  total_cents: z.number().int(),
  created_at: z.string(),
  shipping_address: z.object({ recipient_name: z.string().optional() }).catch({}),
});

export interface AdminOrderSummary {
  readonly id: string;
  readonly status: OrderStatus;
  readonly totalCents: number;
  readonly createdAt: string;
  readonly recipientName: string;
}

export async function listAdminOrders(
  client: PublicSupabaseClient,
  status?: OrderStatus,
): Promise<AdminOrderSummary[]> {
  let query = client
    .from('orders')
    .select('id, status, total_cents, created_at, shipping_address')
    .order('created_at', { ascending: false })
    .limit(MAX_ADMIN_ORDERS);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudo cargar el listado de pedidos: ${error.message}`);
  return z
    .array(adminOrderRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      status: row.status,
      totalCents: row.total_cents,
      createdAt: row.created_at,
      recipientName: row.shipping_address.recipient_name ?? '',
    }));
}

export type ChangeStatusResult =
  | { readonly status: 'ok'; readonly from: OrderStatus; readonly to: OrderStatus }
  | { readonly status: 'notFound' }
  | { readonly status: 'invalidTransition'; readonly from: OrderStatus; readonly to: OrderStatus }
  | { readonly status: 'conflict' };

/**
 * Cambia el estado de un pedido como admin. Rechaza las transiciones que la máquina de estados no
 * permite (CA-17) y actualiza solo si el pedido sigue en el estado leído, para que dos admins no se
 * pisen. La RLS impide la escritura a quien no sea admin aunque esta función se llame mal.
 */
export async function changeOrderStatus(
  client: PublicSupabaseClient,
  orderId: string,
  to: OrderStatus,
): Promise<ChangeStatusResult> {
  const id = z.string().uuid().safeParse(orderId);
  if (!id.success) return { status: 'notFound' };

  const current = await client.from('orders').select('status').eq('id', id.data).maybeSingle();
  if (current.error) throw new Error(`No se pudo leer el pedido: ${current.error.message}`);
  if (!current.data) return { status: 'notFound' };
  const from = z.object({ status: z.enum(ORDER_STATUSES) }).parse(current.data).status;

  if (!canTransition(from, to, 'admin')) return { status: 'invalidTransition', from, to };

  const updated = await client
    .from('orders')
    .update({ status: to })
    .eq('id', id.data)
    .eq('status', from)
    .select('id');
  if (updated.error) throw new Error(`No se pudo cambiar el estado: ${updated.error.message}`);
  if (updated.data.length === 0) return { status: 'conflict' };
  return { status: 'ok', from, to };
}
