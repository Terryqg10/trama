import { z } from 'zod';
import { createPublicClient, type PublicSupabaseClient } from '@/lib/supabase/server';
import { isOffer } from './discount';
import type { CatalogFilters } from './filters';
import { containsPattern } from './search';
import {
  catalogRowSchema,
  productDetailRowSchema,
  sortProducts,
  toCatalogProduct,
  toProductDetail,
  type CatalogProduct,
  type ProductDetail,
} from './product';

// Tope defensivo: el catálogo es pequeño. La paginación llegará si hace falta.
const MAX_PRODUCTS = 200;

const LIST_SELECT =
  'id, slug, name, gender, category, occasion, is_new, created_at, ' +
  'product_images(path, alt, position), ' +
  'product_variants!inner(id, size, color, price_cents, compare_at_cents, stock)';

const DETAIL_SELECT =
  'id, slug, name, description, gender, category, occasion, is_new, created_at, ' +
  'composition, care, model_height_cm, model_size, ' +
  'product_images(path, alt, position), ' +
  'product_variants(id, size, color, price_cents, compare_at_cents, stock)';

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(160);

/**
 * Lista productos con los filtros ya validados (ver `parseCatalogParams`).
 * Las políticas RLS ocultan los inactivos. Los filtros de talla, color y precio
 * actúan sobre la misma variante: "talla M" exige una variante M con stock y,
 * si además hay color, esa misma variante debe tener ese color.
 */
export async function listProducts(
  filters: CatalogFilters,
  client: PublicSupabaseClient = createPublicClient(),
): Promise<CatalogProduct[]> {
  let query = client.from('products').select(LIST_SELECT);

  if (filters.gender) query = query.eq('gender', filters.gender);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.occasion) query = query.eq('occasion', filters.occasion);
  if (filters.onlyNew) query = query.eq('is_new', true);
  if (filters.size) {
    query = query.eq('product_variants.size', filters.size).gt('product_variants.stock', 0);
  }
  if (filters.color) query = query.eq('product_variants.color', filters.color);
  if (filters.minPriceCents !== undefined) {
    query = query.gte('product_variants.price_cents', filters.minPriceCents);
  }
  if (filters.maxPriceCents !== undefined) {
    query = query.lte('product_variants.price_cents', filters.maxPriceCents);
  }

  const { data, error } = await query.limit(MAX_PRODUCTS);
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);

  const rows = z.array(catalogRowSchema).parse(data);
  return sortProducts(rows.map(toCatalogProduct), filters.sort);
}

/**
 * Busca productos activos cuyo nombre contiene el texto, sin distinguir mayúsculas (RF-25, CA-93). El texto llega ya
 * normalizado (`parseSearchQuery`); vacío no consulta. Las políticas RLS ocultan los inactivos.
 */
export async function searchProducts(
  query: string,
  client: PublicSupabaseClient = createPublicClient(),
): Promise<CatalogProduct[]> {
  if (query === '') return [];
  const { data, error } = await client
    .from('products')
    .select(LIST_SELECT)
    .ilike('name', containsPattern(query))
    .limit(MAX_PRODUCTS);
  // El mensaje se recorta: si el cortafuegos de Supabase bloquea la petición, `message` es una página HTML entera.
  if (error) throw new Error(`No se pudo buscar en el catálogo: ${error.message.slice(0, 200)}`);
  const rows = z.array(catalogRowSchema).parse(data);
  return sortProducts(rows.map(toCatalogProduct), 'novedades');
}

/**
 * Productos activos en oferta: los que tienen alguna variante con `compare_at_cents` mayor que su precio (SPEC-005 RF-10,
 * CA-01, T-099). Se piden con todas sus variantes (la tarjeta necesita todas las tallas) y se filtran aquí; el catálogo es
 * pequeño. Sin ofertas, `[]`. Las políticas RLS ocultan los inactivos.
 */
export async function getOfferProducts(
  client: PublicSupabaseClient = createPublicClient(),
): Promise<CatalogProduct[]> {
  const { data, error } = await client.from('products').select(LIST_SELECT).limit(MAX_PRODUCTS);
  if (error) throw new Error(`No se pudieron cargar las ofertas: ${error.message.slice(0, 200)}`);
  const rows = z.array(catalogRowSchema).parse(data);
  return sortProducts(rows.map(toCatalogProduct).filter(isOffer), 'novedades');
}

/**
 * Productos activos por id, en el mismo orden que `ids` (los inactivos o inexistentes se omiten: las políticas RLS los
 * ocultan). Para la lista de favoritos (T-043). Los ids se validan como UUID.
 */
export async function getProductsByIds(
  ids: readonly string[],
  client: PublicSupabaseClient = createPublicClient(),
): Promise<CatalogProduct[]> {
  const parsed = z.array(z.string().uuid()).max(MAX_PRODUCTS).parse([...ids]);
  if (parsed.length === 0) return [];
  const { data, error } = await client.from('products').select(LIST_SELECT).in('id', parsed);
  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message.slice(0, 200)}`);
  const byId = new Map(z.array(catalogRowSchema).parse(data).map((row) => [row.id, toCatalogProduct(row)]));
  return parsed.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

/** Devuelve la ficha de un producto activo, o `null` si no existe o no es visible. */
export async function getProductBySlug(
  slug: string,
  client: PublicSupabaseClient = createPublicClient(),
): Promise<ProductDetail | null> {
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;

  const { data, error } = await client
    .from('products')
    .select(DETAIL_SELECT)
    .eq('slug', parsedSlug.data)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el producto: ${error.message}`);
  if (!data) return null;

  return toProductDetail(productDetailRowSchema.parse(data));
}
