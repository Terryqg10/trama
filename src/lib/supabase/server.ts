import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/types.generated';
import { parsePublicSupabaseEnv } from '@/lib/env';

export type PublicSupabaseClient = SupabaseClient<Database>;

/**
 * Cliente de Supabase de SOLO LECTURA PÚBLICA para el servidor (clave pública).
 * Las políticas RLS deciden qué ve: es el único punto de acceso del catálogo.
 * Nunca usa la clave de servicio. Sin sesión persistente.
 */
export function createPublicClient(
  source: Record<string, string | undefined> = process.env,
): PublicSupabaseClient {
  const env = parsePublicSupabaseEnv(source);
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
