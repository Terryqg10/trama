import { createServiceClient } from '@/lib/supabase/service';
import type { NewsletterInput } from './schema';
import { createNewsletterStore, type NewsletterStore } from './store';
import { confirmTokenSchema, generateConfirmToken, hashConfirmToken, tokenExpiry } from './token';

/** Ruta de la página de confirmación (CA-103). */
export const CONFIRM_PATH = '/newsletter/confirmar';

export type SubscribeResult =
  | { readonly ok: true; readonly token: string }
  | { readonly ok: false };

/**
 * Da de alta un email como PENDIENTE (CA-103, Enmienda 50): no cuenta como suscrito hasta confirmar. Un email nuevo, uno
 * pendiente y uno ya confirmado reciben la misma respuesta (un token nuevo), así que la respuesta no revela quién está en la
 * lista. Cada envío renueva el token y su caducidad. Cualquier fallo de la base de datos se registra sin datos personales
 * y devuelve `{ ok: false }`.
 */
export async function subscribeToNewsletter(
  input: NewsletterInput,
  store: NewsletterStore = createNewsletterStore(createServiceClient()),
  now: number = Date.now(),
  newToken: () => string = generateConfirmToken,
): Promise<SubscribeResult> {
  const token = newToken();
  try {
    await store.savePending({ email: input.email, tokenHash: hashConfirmToken(token), expiresAt: tokenExpiry(now) });
    return { ok: true, token };
  } catch (error) {
    console.error('subscribeToNewsletter falló', error instanceof Error ? error.message.slice(0, 80) : 'error desconocido');
    return { ok: false };
  }
}

export type ConfirmResult = 'confirmed' | 'expired' | 'invalid' | 'error';

/**
 * Confirma una alta con el token del enlace (CA-103). El texto llega del navegador: se valida su forma con Zod antes de
 * tocar la base de datos. Solo se guarda el hash; el token se gasta al confirmar (un solo uso). Caducado, usado o inventado
 * no cambian nada.
 */
export async function confirmSubscription(
  rawToken: unknown,
  store: NewsletterStore = createNewsletterStore(createServiceClient()),
  now: number = Date.now(),
): Promise<ConfirmResult> {
  const parsed = confirmTokenSchema.safeParse(rawToken);
  if (!parsed.success) return 'invalid';
  const hash = hashConfirmToken(parsed.data);
  try {
    const stored = await store.findByTokenHash(hash);
    if (!stored) return 'invalid';
    if (stored.expiresAt === null || Date.parse(stored.expiresAt) <= now) return 'expired';
    return (await store.markConfirmed(hash, new Date(now).toISOString())) ? 'confirmed' : 'invalid';
  } catch (error) {
    console.error('confirmSubscription falló', error instanceof Error ? error.message.slice(0, 80) : 'error desconocido');
    return 'error';
  }
}

/** Enlace de confirmación que se enseña en pantalla en la demo (sin correo propio). Con un proveedor real iría en el correo. */
export function confirmHref(token: string): string {
  return `${CONFIRM_PATH}?token=${token}`;
}
