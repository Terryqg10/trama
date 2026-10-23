import { handleStripeEvent } from '@/lib/checkout/webhook';
import { redeemCouponForOrder } from '@/lib/coupons/store';
import { createStripeClient } from '@/lib/stripe/client';
import { verifyWebhookEvent } from '@/lib/stripe/webhook';
import { createServiceClient } from '@/lib/supabase/service';

// El cuerpo debe leerse sin parsear para verificar la firma: esta ruta no usa sesión ni caché.
export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe (RF-07). Firma inválida o ausente: 400 sin efectos y con un registro del intento
 * (CA-12). Firma válida: se procesa de forma idempotente (CA-13). Un fallo de la BD responde 500 para que
 * Stripe reintente con su propio calendario; no hay reintentos propios.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const stripe = createStripeClient();

  let event;
  try {
    event = verifyWebhookEvent(stripe, rawBody, request.headers.get('stripe-signature'));
  } catch (error) {
    // Sin datos personales: solo el motivo del rechazo.
    console.warn('Webhook de Stripe rechazado:', error instanceof Error ? error.message : 'firma inválida');
    return Response.json({ error: 'Firma inválida' }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    // Tras confirmar el pago se canjea el cupón del pedido, si lo tiene (CA-139). Idempotente: un evento repetido no lo toca.
    const outcome = await handleStripeEvent(service, event, {
      redeemCoupon: (orderId) => redeemCouponForOrder(service, orderId).then(() => undefined),
    });
    if (outcome.kind === 'lateOrUnknown') {
      // Un pago recibido para un pedido que no está pendiente o no existe: hay que revisarlo a mano.
      console.error('Webhook de Stripe: pago sin pedido pendiente', { eventId: event.id, reason: outcome.reason });
    }
    return Response.json({ received: true, outcome: outcome.kind });
  } catch (error) {
    console.error('Webhook de Stripe: fallo al procesar', event.id, error instanceof Error ? error.message : 'error');
    return Response.json({ error: 'Error al procesar el evento' }, { status: 500 });
  }
}
