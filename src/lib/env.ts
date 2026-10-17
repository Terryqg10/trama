import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_test_', 'Solo se admiten claves Stripe de modo test (pk_test_)'),
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith('sk_test_', 'Solo se admiten claves Stripe de modo test (sk_test_)'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
});

export type Env = z.infer<typeof envSchema>;

// Subconjunto público de Supabase: lo único que necesita la lectura del catálogo.
// No exige claves de Stripe ni la clave de servicio.
const publicSupabaseEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;

export function parsePublicSupabaseEnv(source: Record<string, string | undefined>): PublicSupabaseEnv {
  const result = publicSupabaseEnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Entorno de Supabase inválido: ${detail}`);
  }
  return result.data;
}

/**
 * Valida un origen de variables de entorno. Recibe el objeto como argumento
 * (p. ej. `process.env`) para poder probarse sin tocar archivos `.env*`.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Entorno inválido: ${detail}`);
  }
  return result.data;
}

// Subconjunto de servidor: lo único que necesita el cliente de servicio (reservas, pedidos, webhook).
// La clave de servicio salta RLS: nunca va a un componente de cliente ni a una variable NEXT_PUBLIC_*.
const serviceSupabaseEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  SUPABASE_SERVICE_ROLE_KEY: true,
});

export type ServiceSupabaseEnv = z.infer<typeof serviceSupabaseEnvSchema>;

export function parseServiceSupabaseEnv(source: Record<string, string | undefined>): ServiceSupabaseEnv {
  const result = serviceSupabaseEnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Entorno de servicio de Supabase inválido: ${detail}`);
  }
  return result.data;
}

// Subconjunto de Stripe para crear sesiones de pago. Solo claves de modo test (CA-24): una `sk_live_`
// se rechaza aquí igual que en `parseEnv`.
const stripeServerEnvSchema = envSchema.pick({ STRIPE_SECRET_KEY: true });

export type StripeServerEnv = z.infer<typeof stripeServerEnvSchema>;

export function parseStripeServerEnv(source: Record<string, string | undefined>): StripeServerEnv {
  const result = stripeServerEnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Entorno de Stripe inválido: ${detail}`);
  }
  return result.data;
}

// Secreto de firma del webhook de Stripe (T-033).
const stripeWebhookEnvSchema = envSchema.pick({ STRIPE_WEBHOOK_SECRET: true });

export type StripeWebhookEnv = z.infer<typeof stripeWebhookEnvSchema>;

export function parseStripeWebhookEnv(source: Record<string, string | undefined>): StripeWebhookEnv {
  const result = stripeWebhookEnvSchema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Entorno del webhook de Stripe inválido: ${detail}`);
  }
  return result.data;
}
