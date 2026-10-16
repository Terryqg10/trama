import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/db/types.generated';
import { parsePublicSupabaseEnv } from '@/lib/env';
import type { PublicSupabaseClient } from './server';

/**
 * Cliente de Supabase con la sesión del cliente (cookies), solo para el servidor.
 * Usa la clave pública: lo que puede ver y escribir lo deciden las políticas RLS.
 * Nunca usa la clave de servicio.
 */
export async function createAuthClient(): Promise<PublicSupabaseClient> {
  const env = parsePublicSupabaseEnv(process.env);
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya renueva la sesión.
        }
      },
    },
  });
}
