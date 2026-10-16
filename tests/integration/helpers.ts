import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../../src/lib/db/types.generated';

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

// Falla de forma explícita si faltan variables: estos tests no se saltan.
export function readSupabaseEnv(): z.infer<typeof supabaseEnvSchema> {
  return supabaseEnvSchema.parse(process.env);
}

export function serviceClient(): SupabaseClient {
  const env = readSupabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function anonClient(): SupabaseClient {
  const env = readSupabaseEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonymousClient(): SupabaseClient {
  return anonClient();
}

/** Cliente anónimo tipado con el esquema generado: el que usa la capa del catálogo. */
export function publicClient(): SupabaseClient<Database> {
  const env = readSupabaseEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  client: SupabaseClient;
}

/**
 * Crea un usuario de prueba con credenciales generadas en tiempo de ejecución
 * (nunca fijas en el repo) y devuelve un cliente autenticado como él.
 */
export async function createTestUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `rls-${label}-${randomUUID()}@example.test`;
  const password = randomUUID();

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${created.error?.message ?? 'sin usuario'}`);
  }

  const client = anonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    throw new Error(`No se pudo iniciar sesión con el usuario de prueba: ${signedIn.error.message}`);
  }

  return { id: created.data.user.id, client };
}

/**
 * Promueve a un usuario de prueba a admin. Solo el servicio puede hacerlo:
 * `profiles.role` no es editable por el cliente (T-003).
 */
export async function promoteToAdmin(admin: SupabaseClient, userId: string): Promise<void> {
  const result = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId);
  if (result.error) {
    throw new Error(`No se pudo promover al usuario ${userId}: ${result.error.message}`);
  }
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  // El borrado en cascada elimina profile y direcciones; los pedidos pasan a user_id null.
  const result = await admin.auth.admin.deleteUser(userId);
  if (result.error) {
    throw new Error(`No se pudo borrar el usuario de prueba ${userId}: ${result.error.message}`);
  }
}

export const idRowsSchema = z.array(z.object({ id: z.string() }));

export const sampleAddress = {
  recipient_name: 'Cliente de prueba',
  line1: 'Calle de Prueba 1',
  postal_code: '28001',
  city: 'Madrid',
  province: 'Madrid',
} as const;

export const sampleShippingAddress = { ...sampleAddress, country: 'ES' } as const;
