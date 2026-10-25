'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { addFavorite, removeFavorite } from './favorites';
import { productIdSchema } from './schemas';

export type SetFavoriteResult =
  | { readonly status: 'ok'; readonly favorite: boolean }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'error' };

const inputSchema = z.object({ productId: productIdSchema, favorite: z.boolean() });

/**
 * Marca o desmarca un favorito del cliente con sesión (RF-24, CA-77, T-042). La entrada se valida con Zod; las
 * operaciones usan el cliente de la sesión (RLS, T-041). Marcar uno ya marcado o quitar uno no marcado también deja el
 * estado pedido. Sin sesión no hace nada y lo dice, para que el navegador lleve al acceso.
 */
export async function setFavoriteAction(productId: string, favorite: boolean): Promise<SetFavoriteResult> {
  const parsed = inputSchema.safeParse({ productId, favorite });
  if (!parsed.success) return { status: 'error' };
  try {
    const { client, user } = await getCurrentUser();
    if (!user) return { status: 'unauthenticated' };
    if (parsed.data.favorite) {
      const result = await addFavorite(client, user.id, parsed.data.productId);
      if (result === 'added' || result === 'already') return { status: 'ok', favorite: true };
      return { status: 'error' };
    }
    await removeFavorite(client, parsed.data.productId);
    return { status: 'ok', favorite: false };
  } catch (error) {
    console.error('setFavoriteAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error' };
  }
}

/**
 * Quitar un favorito desde la lista de la cuenta (CA-78, T-043). Formulario de servidor: funciona sin JavaScript. La
 * entrada se valida con Zod y la operación usa la sesión (RLS); un id inválido o una sesión caducada no hacen nada.
 */
export async function removeFavoriteFormAction(formData: FormData): Promise<void> {
  const productId = productIdSchema.safeParse(formData.get('productId'));
  if (!productId.success) return;
  try {
    const { client, user } = await getCurrentUser();
    if (!user) return;
    await removeFavorite(client, productId.data);
  } catch (error) {
    console.error('removeFavoriteFormAction falló', error instanceof Error ? error.message : 'error desconocido');
  }
  revalidatePath('/cuenta/favoritos');
}
