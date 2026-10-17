import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseServiceSupabaseEnv } from '@/lib/env';

/**
 * Cliente de Supabase con la clave de servicio: salta RLS. SOLO para código de servidor que lo
 * necesita de verdad (crear pedidos, reservar stock, procesar el webhook). Nunca se importa desde un
 * componente de cliente ni se expone al navegador. Sin sesión persistente.
 *
 * No lleva el tipo generado de la BD: las funciones SQL de la reserva aún no están en
 * `types.generated.ts` (se regenera con `pnpm run db:types` tras aplicar la migración). Las respuestas
 * se validan con Zod en el punto de uso.
 */
export function createServiceClient(
  source: Record<string, string | undefined> = process.env,
): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createServiceClient solo puede usarse en el servidor.');
  }
  const env = parseServiceSupabaseEnv(source);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
