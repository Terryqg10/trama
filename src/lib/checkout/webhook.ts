import type Stripe from 'stripe';
import { z } from 'zod';
import { releaseOrderReservations, type RpcClient } from './reservation';

/**
 * Procesa un evento de Stripe ya verificado (RF-07, CA-11, CA-13). La parte atómica e idempotente vive
 * en la función SQL `confirm_order_payment` (`supabase/migrations/20261018000000_confirm_payment.sql`).
 */

const orderIdSchema = z.string().uuid();

const confirmResponseSchema = z.object({
  ok: z.literal(true),
  result: z.enum(['paid', 'duplicate', 'not_pending', 'order_not_found']),
  status: z.string().optional(),
});

export type WebhookOutcome =
  | { readonly kind: 'paid' | 'duplicate' | 'cancelled' | 'ignored' }
  | { readonly kind: 'lateOrUnknown'; readonly reason: 'not_pending' | 'order_not_found' | 'invalid_order' };

/** Id del pedido de una sesión de pago: `client_reference_id`, o el metadato `order_id` como respaldo. */
export function orderIdFromSession(
  session: Pick<Stripe.Checkout.Session, 'client_reference_id'> & { readonly metadata?: Stripe.Metadata | null },
): string | null {
  const parsed = orderIdSchema.safeParse(session.client_reference_id ?? session.metadata?.['order_id']);
  return parsed.success ? parsed.data : null;
}

/**
 * Aplica un evento verificado. Lanza si falla la base de datos (el webhook responde 500 y Stripe reintenta).
 * Los eventos que no interesan se ignoran con éxito para que Stripe no los reintente.
 */
export async function handleStripeEvent(client: RpcClient, event: Stripe.Event): Promise<WebhookOutcome> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;
      // Un pago aún no completado (p. ej. transferencia pendiente) no confirma nada.
      if (session.payment_status !== 'paid') return { kind: 'ignored' };
      const orderId = orderIdFromSession(session);
      if (!orderId) return { kind: 'lateOrUnknown', reason: 'invalid_order' };

      const { data, error } = await client.rpc('confirm_order_payment', {
        p_order_id: orderId,
        p_event_id: event.id,
      });
      if (error) throw new Error(`No se pudo confirmar el pago: ${error.message}`);
      const response = confirmResponseSchema.parse(data);
      if (response.result === 'paid' || response.result === 'duplicate') return { kind: response.result };
      return { kind: 'lateOrUnknown', reason: response.result };
    }

    case 'checkout.session.expired': {
      const orderId = orderIdFromSession(event.data.object);
      if (!orderId) return { kind: 'ignored' };
      // Solo cancela si el pedido sigue pendiente: un pedido ya pagado no se toca.
      await releaseOrderReservations(client, orderId);
      return { kind: 'cancelled' };
    }

    default:
      return { kind: 'ignored' };
  }
}
