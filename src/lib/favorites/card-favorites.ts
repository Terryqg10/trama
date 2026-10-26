import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { listFavoriteProductIds } from './favorites';

/**
 * Ids de favoritos para marcar los corazones de las tarjetas (CA-147, T-115). Sin sesión no consulta; si la consulta
 * falla, devuelve una lista vacía (las tarjetas salen sin marcar) y no rompe el listado.
 */
export async function loadCardFavoriteIds(client: PublicSupabaseClient, signedIn: boolean): Promise<string[]> {
  if (!signedIn) return [];
  try {
    return await listFavoriteProductIds(client);
  } catch (error) {
    console.error('loadCardFavoriteIds: no se pudieron cargar los favoritos', error instanceof Error ? error.message : 'error');
    return [];
  }
}
