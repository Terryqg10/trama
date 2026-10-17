import { z } from 'zod';
import type { PublicSupabaseClient } from '@/lib/supabase/server';

/**
 * Historial de pedidos del cliente (RF-08, CA-14). Todas las consultas usan el cliente con la sesión
 * del cliente: la RLS de `orders` y `order_items` limita las filas a su dueño. Además se filtra por
 * `user_id` como segunda barrera.
 */

export const ORDER_STATUSES = ['pendiente', 'pagado', 'preparado', 'enviado', 'entregado', 'cancelado'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pendiente: 'Pendiente de pago',
  pagado: 'Pagado',
  preparado: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const STATUS_HINTS: Readonly<Record<OrderStatus, string>> = {
  pendiente: 'Aún no hemos recibido el pago de este pedido.',
  pagado: 'Hemos recibido tu pago. Prepararemos el pedido en breve.',
  preparado: 'Estamos preparando tu pedido.',
  enviado: 'Tu pedido va de camino.',
  entregado: 'Tu pedido ha sido entregado.',
  cancelado: 'Este pedido está cancelado.',
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status];
}

export function statusHint(status: OrderStatus): string {
  return STATUS_HINTS[status];
}

/** Número corto y legible del pedido, derivado de su id. */
export function orderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

const addressSnapshotSchema = z
  .object({
    recipient_name: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().nullable().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
  })
  .catch({});

const orderRowSchema = z.object({
  id: z.string(),
  status: z.enum(ORDER_STATUSES),
  total_cents: z.number().int(),
  shipping_cents: z.number().int(),
  created_at: z.string(),
});

const itemRowSchema = z.object({
  variant_id: z.string(),
  product_name: z.string(),
  size: z.string(),
  color: z.string(),
  qty: z.number().int(),
  unit_price_cents: z.number().int(),
});

export interface OrderSummary {
  readonly id: string;
  readonly status: OrderStatus;
  readonly totalCents: number;
  readonly shippingCents: number;
  readonly createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  readonly address: z.infer<typeof addressSnapshotSchema>;
  readonly items: ReadonlyArray<{
    readonly variantId: string;
    readonly productName: string;
    readonly size: string;
    readonly color: string;
    readonly qty: number;
    readonly unitPriceCents: number;
  }>;
}

/** Tope del historial: suficiente para una tienda pequeña; la paginación llegará si hace falta. */
export const MAX_ORDERS = 50;

function toSummary(row: z.infer<typeof orderRowSchema>): OrderSummary {
  return {
    id: row.id,
    status: row.status,
    totalCents: row.total_cents,
    shippingCents: row.shipping_cents,
    createdAt: row.created_at,
  };
}

export async function listOrders(client: PublicSupabaseClient, userId: string): Promise<OrderSummary[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, status, total_cents, shipping_cents, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ORDERS);
  if (error) throw new Error(`No se pudo cargar el historial de pedidos: ${error.message}`);
  return z.array(orderRowSchema).parse(data).map(toSummary);
}

/**
 * Devuelve el pedido o `null` si no existe o no es visible para la sesión (la RLS lo oculta). Con `userId`
 * se filtra además por dueño (historial del cliente); con `null` solo decide la RLS (panel admin).
 */
export async function getOrder(
  client: PublicSupabaseClient,
  userId: string | null,
  orderId: string,
): Promise<OrderDetail | null> {
  const parsedId = z.string().uuid().safeParse(orderId);
  if (!parsedId.success) return null;

  let query = client
    .from('orders')
    .select('id, status, total_cents, shipping_cents, created_at, shipping_address')
    .eq('id', parsedId.data);
  if (userId !== null) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`No se pudo cargar el pedido: ${error.message}`);
  if (!data) return null;

  const items = await client
    .from('order_items')
    .select('variant_id, product_name, size, color, qty, unit_price_cents')
    .eq('order_id', parsedId.data);
  if (items.error) throw new Error(`No se pudieron cargar las líneas del pedido: ${items.error.message}`);

  const row = orderRowSchema.parse(data);
  return {
    ...toSummary(row),
    address: addressSnapshotSchema.parse(data.shipping_address),
    items: z
      .array(itemRowSchema)
      .parse(items.data)
      .map((item) => ({
        variantId: item.variant_id,
        productName: item.product_name,
        size: item.size,
        color: item.color,
        qty: item.qty,
        unitPriceCents: item.unit_price_cents,
      })),
  };
}
