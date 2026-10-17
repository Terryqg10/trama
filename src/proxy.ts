import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { parsePublicSupabaseEnv } from '@/lib/env';

/**
 * Renueva la sesión de Supabase en las rutas de cuenta, carrito y ficha (RF-04, T-031). Los Server Components no pueden
 * escribir cookies, así que el refresco del token vive aquí. No decide accesos: cada página
 * protegida comprueba al usuario con `getUser()`.
 */
export async function proxy(request: NextRequest) {
  const env = parsePublicSupabaseEnv(process.env);
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    '/cuenta/:path*',
    '/acceso',
    '/registro',
    '/recuperar/:path*',
    '/auth/:path*',
    '/carrito',
    '/checkout',
    '/pedido/:path*',
    '/admin/:path*',
    '/producto/:path*',
  ],
};
