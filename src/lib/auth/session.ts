import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase/auth-server';
import type { PublicSupabaseClient } from '@/lib/supabase/server';

/** Usuario de la sesión, validado contra Supabase Auth (`getUser`, no solo la cookie). */
export async function getCurrentUser(): Promise<{ client: PublicSupabaseClient; user: User | null }> {
  const client = await createAuthClient();
  const { data } = await client.auth.getUser();
  return { client, user: data.user };
}

/** Para páginas protegidas: sin sesión redirige al acceso. */
export async function requireUser(): Promise<{ client: PublicSupabaseClient; user: User }> {
  const { client, user } = await getCurrentUser();
  if (!user) redirect('/acceso');
  return { client, user };
}
