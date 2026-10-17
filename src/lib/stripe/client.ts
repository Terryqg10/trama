import Stripe from 'stripe';
import { parseStripeServerEnv } from '@/lib/env';

/**
 * Único punto de acceso a la API de Stripe (spec §10: nunca `fetch` directo ni desde un componente).
 * Solo claves de modo test: `parseStripeServerEnv` rechaza una `sk_live_`. Solo servidor.
 * Sin reintentos automáticos: un fallo de red se devuelve al llamador, que falla cerrado.
 */
export function createStripeClient(source: Record<string, string | undefined> = process.env): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error('createStripeClient solo puede usarse en el servidor.');
  }
  const env = parseStripeServerEnv(source);
  return new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 0, timeout: 15_000 });
}
