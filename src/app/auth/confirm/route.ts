import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAuthClient } from '@/lib/supabase/auth-server';

const confirmParamsSchema = z.object({
  next: z.enum(['/cuenta', '/recuperar/nueva']).default('/cuenta'),
  code: z.string().min(1).max(512).optional(),
  token_hash: z.string().min(1).max(512).optional(),
  type: z.enum(['recovery', 'signup', 'email']).optional(),
});

/**
 * Destino de los enlaces del correo (confirmar cuenta, recuperar contraseña). Admite el flujo PKCE
 * (`code`) y el de `token_hash`. `next` es una lista blanca: nunca se redirige a una URL arbitraria.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const params = confirmParamsSchema.safeParse(Object.fromEntries(searchParams));
  const failure = NextResponse.redirect(new URL('/recuperar?error=enlace', origin));
  if (!params.success) return failure;

  const supabase = await createAuthClient();
  const { code, token_hash: tokenHash, type, next } = params.data;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? failure : NextResponse.redirect(new URL(next, origin));
  }
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? failure : NextResponse.redirect(new URL(next, origin));
  }
  return failure;
}
