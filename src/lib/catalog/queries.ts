import { z } from 'zod';
import { createPublicClient, type PublicSupabaseClient } from '@/lib/supabase/server';
import type { CatalogFilters } from './filters';
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
  'product_variants!inner(id, size, color, price_cents, stock)';

const DETAIL_SELECT =
  'id, slug, name, description, gender, category, occasion, is_new, created_at, ' +
  'composition, care, model_height_cm, model_size, ' +
  'product_images(path, alt, position), ' +
  'product_variants(id, size, color, price_cents, stock)';

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
