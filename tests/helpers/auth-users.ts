import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { z } from 'zod';

/**
 * Usuarios de prueba para los e2e de cuenta (T-017). Las claves se leen del entorno del
 * proyecto con `loadEnv` (sin abrir ningún `.env*` a mano) y nunca se escriben en el repo.
 * Las credenciales de cada usuario se generan en tiempo de ejecución.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function adminClient(): SupabaseClient {
  const env = envSchema.parse({ ...loadEnv('test', process.cwd(), ''), ...process.env });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export function newCredentials(label: string): Credentials {
  return { email: `e2e-${label}-${randomUUID()}@example.test`, password: randomUUID() };
}

/** Crea una cuenta ya confirmada, lista para iniciar sesión por la interfaz. */
export async function createConfirmedUser(admin: SupabaseClient, credentials: Credentials): Promise<string> {
  const created = await admin.auth.admin.createUser({ ...credentials, email_confirm: true });
  if (created.error || !created.data.user) {
    throw new Error(`No se pudo crear el usuario e2e: ${created.error?.message ?? 'sin usuario'}`);
  }
  return created.data.user.id;
}

/** Busca por email (los usuarios e2e son pocos) y lo borra; el borrado en cascada limpia perfil y direcciones. */
export async function deleteUserByEmail(admin: SupabaseClient, email: string): Promise<void> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw new Error(`No se pudo listar usuarios: ${listed.error.message}`);
  const user = listed.data.users.find((candidate) => candidate.email === email);
  if (!user) return;
  const removed = await admin.auth.admin.deleteUser(user.id);
  if (removed.error) throw new Error(`No se pudo borrar el usuario e2e: ${removed.error.message}`);
}
