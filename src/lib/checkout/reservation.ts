import { z } from 'zod';
import { MAX_CART_LINES, MAX_LINE_QTY } from '@/lib/cart/cart';

/**
 * Reserva de stock (RF-11, CA-18, CA-19). La lógica atómica vive en la base de datos
 * (`supabase/migrations/20261017000000_stock_reservation.sql`); aquí solo se validan las entradas y
 * las respuestas y se llama a las funciones con un cliente de servicio.
 */

/** Lo único que se necesita del cliente de Supabase: llamar a funciones SQL (facilita las pruebas). */
export interface RpcClient {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** Plazo de la reserva. Stripe exige que la sesión de pago dure al menos 30 minutos (VERIFICAR). */
export const RESERVATION_TTL_MINUTES = 30;

export const reservationLineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
});
export const reservationLinesSchema = z.array(reservationLineSchema).min(1).max(MAX_CART_LINES);
export type ReservationLine = z.infer<typeof reservationLineSchema>;

const shortageSchema = z.object({
  variant_id: z.string(),
  requested: z.number().int(),
  available: z.number().int(),
});

const reserveResponseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), expires_at: z.string() }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(['invalid_lines', 'order_not_pending', 'already_reserved', 'insufficient_stock']),
    shortages: z.array(shortageSchema).optional(),
  }),
]);

export type ReserveResult =
  | { readonly ok: true; readonly expiresAt: string }
  | {
      readonly ok: false;
      readonly reason: 'invalid_lines' | 'order_not_pending' | 'already_reserved' | 'insufficient_stock';
      readonly shortages: ReadonlyArray<{
        readonly variantId: string;
        readonly requested: number;
        readonly available: number;
      }>;
    };

/**
 * Reserva todas las líneas del pedido o ninguna. Si alguna no cabe, devuelve las faltas (CA-18).
 * Un fallo de la base de datos lanza: el llamador falla cerrado y no cobra.
 */
export async function reserveStock(
  client: RpcClient,
  orderId: string,
  lines: readonly ReservationLine[],
): Promise<ReserveResult> {
  const parsedLines = reservationLinesSchema.parse([...lines]);
  const { data, error } = await client.rpc('reserve_stock', {
    p_order_id: z.string().uuid().parse(orderId),
    p_lines: parsedLines.map((line) => ({ variant_id: line.variantId, qty: line.qty })),
    p_ttl: `${RESERVATION_TTL_MINUTES} minutes`,
  });
  if (error) throw new Error(`No se pudo reservar el stock: ${error.message}`);

  const response = reserveResponseSchema.parse(data);
  if (response.ok) return { ok: true, expiresAt: response.expires_at };
  return {
    ok: false,
    reason: response.reason,
    shortages: (response.shortages ?? []).map((item) => ({
      variantId: item.variant_id,
      requested: item.requested,
      available: item.available,
    })),
  };
}

/** Libera las reservas vencidas y cancela los pedidos pendientes que se quedan sin reserva (CA-19). */
export async function releaseExpiredReservations(client: RpcClient): Promise<number> {
  const { data, error } = await client.rpc('release_expired_reservations');
  if (error) throw new Error(`No se pudo liberar las reservas vencidas: ${error.message}`);
  return z.number().int().nonnegative().parse(data);
}

/** Libera las reservas activas de un pedido y lo cancela si seguía pendiente (cancelación del cliente). */
export async function releaseOrderReservations(client: RpcClient, orderId: string): Promise<number> {
  const { data, error } = await client.rpc('release_order_reservations', {
    p_order_id: z.string().uuid().parse(orderId),
  });
  if (error) throw new Error(`No se pudo liberar la reserva del pedido: ${error.message}`);
  return z.number().int().nonnegative().parse(data);
}
