import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { favoriteRowSchema, productIdSchema } from './schemas';

/**
 * Favoritos de la cuenta (RF-24, ADR-010, T-041). Todas las funciones reciben el cliente con la sesión del cliente:
 * las políticas RLS de `favorites` limitan cada operación a su dueño. Nunca se usa la clave de servicio. Los casos
 * esperados (id inválido, producto inexistente o inactivo, ya marcado, no marcado) devuelven un resultado, no lanzan;
 * solo un fallo inesperado de la BD lanza.
 */

export type AddFavoriteResult = 'added' | 'already' | 'invalid' | 'not_found';
export type RemoveFavoriteResult = 'removed' | 'not_favorite' | 'invalid';

const UNIQUE_VIOLATION = '23505';
// Producto que no existe (FK) o que el cliente no puede ver (el `with check` de la política lo rechaza).
const NOT_FOUND_CODES = new Set(['23503', '42501']);

export async function addFavorite(
  client: PublicSupabaseClient,
  userId: string,
  rawProductId: string,
): Promise<AddFavoriteResult> {
  const productId = productIdSchema.safeParse(rawProductId);
  if (!productId.success) return 'invalid';
  const { error } = await client.from('favorites').insert({ user_id: userId, product_id: productId.data });
  if (!error) return 'added';
  if (error.code === UNIQUE_VIOLATION) return 'already';
  if (NOT_FOUND_CODES.has(error.code)) return 'not_found';
  throw new Error(`No se pudo marcar el favorito: ${error.message.slice(0, 200)}`);
}

export async function removeFavorite(client: PublicSupabaseClient, rawProductId: string): Promise<RemoveFavoriteResult> {
  const productId = productIdSchema.safeParse(rawProductId);
  if (!productId.success) return 'invalid';
  const { data, error } = await client.from('favorites').delete().eq('product_id', productId.data).select('product_id');
  if (error) throw new Error(`No se pudo quitar el favorito: ${error.message.slice(0, 200)}`);
  return data.length > 0 ? 'removed' : 'not_favorite';
}

export async function isFavorite(client: PublicSupabaseClient, rawProductId: string): Promise<boolean> {
  const productId = productIdSchema.safeParse(rawProductId);
  if (!productId.success) return false;
  const { data, error } = await client
    .from('favorites')
    .select('product_id')
    .eq('product_id', productId.data)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar el favorito: ${error.message.slice(0, 200)}`);
  return data !== null;
}

/** Ids de los productos favoritos del cliente, del más reciente al más antiguo. */
export async function listFavoriteProductIds(client: PublicSupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('favorites')
    .select('product_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`No se pudieron cargar los favoritos: ${error.message.slice(0, 200)}`);
  return data.map((row) => favoriteRowSchema.parse(row).product_id);
}
