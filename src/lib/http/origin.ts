import { headers } from 'next/headers';

/**
 * Origen público de la petición actual (`https://host`), para construir URL absolutas de retorno
 * (correos de Supabase, sesión de pago de Stripe). Solo servidor. Los proveedores validan además el
 * destino contra su lista de URL permitidas.
 */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host ?? 'localhost:3000'}`;
}
