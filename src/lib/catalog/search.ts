import { z } from 'zod';
import type { CatalogProduct } from './product';

/** Longitud máxima del texto de búsqueda (CA-93). */
export const MAX_SEARCH_LENGTH = 60;

/**
 * Normaliza el texto de la búsqueda (RF-25) con una lista blanca: solo letras (con tildes), números y guiones; todo lo
 * demás pasa a espacio y los espacios se colapsan. Así no llegan a la base de datos comillas, `;`, `*`, `%` ni `--`:
 * el cortafuegos de Supabase (Cloudflare) bloquea con una página HTML los textos que parecen una inyección SQL, y
 * ningún nombre de producto los necesita. Entrada inválida o vacía → cadena vacía.
 */
export function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .replace(/-{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .trim();
}

/** Patrón `ilike` «contiene el texto»: `%`, `_` y `\` se tratan como texto (defensa en profundidad). */
export function containsPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Mínimo de caracteres para pedir sugerencias (CA-106). */
export const MIN_SUGGEST_LENGTH = 2;
/** Máximo de sugerencias que devuelve la API (CA-106). */
export const MAX_SUGGESTIONS = 5;

/** Sugerencia de producto del buscador: lo justo para pintar miniatura, nombre y precio «desde». */
export const searchHitSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int().nonnegative(),
  image: z.object({ path: z.string(), alt: z.string() }).nullable(),
});
export const searchHitsSchema = z.array(searchHitSchema).max(MAX_SUGGESTIONS);
export type SearchHit = z.infer<typeof searchHitSchema>;

/** Convierte un producto del catálogo en su sugerencia (imagen de la posición 0). */
export function toSearchHit(product: CatalogProduct): SearchHit {
  const image = product.images[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.fromPriceCents,
    image: image ? { path: image.path, alt: image.alt } : null,
  };
}
