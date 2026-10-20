import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parsePublicSupabaseEnv } from '@/lib/env';
import type { NewsletterInput } from './schema';

/** Código de PostgreSQL de «violación de unicidad»: el email ya estaba suscrito. */
const UNIQUE_VIOLATION = '23505';

/** Lo mínimo que necesita el alta de un cliente de Supabase (así se puede probar sin red). */
export interface NewsletterClient {
  from(table: 'newsletter_subscribers'): {
    insert(values: { email: string; consent: boolean }): PromiseLike<{ error: { code?: string } | null }>;
  };
}

export type SubscribeResult = { readonly ok: true } | { readonly ok: false };

/**
 * Cliente con la clave pública y SIN tipar: la tabla `newsletter_subscribers` no está en `types.generated.ts`
 * hasta regenerar los tipos tras aplicar la migración (T-058). La entrada ya llega validada con Zod.
 */
function createNewsletterClient(source: Record<string, string | undefined> = process.env): SupabaseClient {
  const env = parsePublicSupabaseEnv(source);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Da de alta un email (CA-100). Un email que ya estaba suscrito cuenta como éxito: así la respuesta no revela quién
 * está en la lista. Solo se inserta (la RLS no permite leer ni cambiar): no se devuelve ninguna fila. Cualquier otro
 * error se registra sin datos personales y devuelve `{ ok: false }`.
 */
export async function subscribeToNewsletter(
  input: NewsletterInput,
  client: NewsletterClient = createNewsletterClient(),
): Promise<SubscribeResult> {
  const { error } = await client.from('newsletter_subscribers').insert({ email: input.email, consent: input.consent });
  if (!error || error.code === UNIQUE_VIOLATION) return { ok: true };
  console.error('subscribeToNewsletter falló', error.code ?? 'sin código');
  return { ok: false };
}
