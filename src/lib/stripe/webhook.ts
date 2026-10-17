import type Stripe from 'stripe';
import { parseStripeWebhookEnv } from '@/lib/env';

/**
 * Verificación de la firma del webhook de Stripe (RF-07, CA-12). Se firma el cuerpo CRUDO: si se
 * parsea y se vuelve a serializar, la firma deja de coincidir. Lanza si falta la cabecera, la firma no
 * coincide o la marca de tiempo está fuera de tolerancia.
 */
export function verifyWebhookEvent(
  stripe: Stripe,
  rawBody: string,
  signatureHeader: string | null,
  source: Record<string, string | undefined> = process.env,
): Stripe.Event {
  if (!signatureHeader) throw new Error('Falta la cabecera stripe-signature');
  const { STRIPE_WEBHOOK_SECRET } = parseStripeWebhookEnv(source);
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
}
