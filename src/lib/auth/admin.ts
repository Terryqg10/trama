import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from './session';

/** ¿Es admin? Lee el rol propio con la sesión del usuario (la RLS deja leer el propio perfil). */
export async function isAdmin(client: PublicSupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return z.object({ role: z.string() }).parse(data).role === 'admin';
}

/**
 * Para páginas del panel: sin sesión lleva al acceso y sin rol admin a la portada (spec §5:
 * «403/redirección»). Es una comodidad: las políticas RLS rechazan las escrituras de un no admin
 * aunque se salte la interfaz.
 */
export async function requireAdmin(): Promise<{ client: PublicSupabaseClient; user: User }> {
  const { client, user } = await getCurrentUser();
  if (!user) redirect('/acceso');
  if (!(await isAdmin(client, user.id))) redirect('/');
  return { client, user };
}
