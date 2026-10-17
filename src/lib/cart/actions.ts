'use server';

import { fetchCartLines, variantIdsSchema, type CartLineInfo } from './lines';

export type CartLinesResult =
  | { readonly status: 'ok'; readonly lines: readonly CartLineInfo[] }
  | { readonly status: 'error' };

/** Precio, stock y datos actuales de las variantes del carrito (entrada validada con Zod). */
export async function getCartLinesAction(variantIds: readonly string[]): Promise<CartLinesResult> {
  const parsed = variantIdsSchema.safeParse(variantIds);
  if (!parsed.success) return { status: 'error' };
  try {
    return { status: 'ok', lines: await fetchCartLines(parsed.data) };
  } catch (error) {
    console.error('getCartLinesAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error' };
  }
}
