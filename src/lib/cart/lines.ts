import { z } from 'zod';
import { productImagePathSchema } from '@/lib/catalog/image-path';
import { imageForColor } from '@/lib/catalog/variant-selection';
import { createPublicClient, type PublicSupabaseClient } from '@/lib/supabase/server';
import { MAX_CART_LINES } from './cart';

/**
 * Datos actuales de las variantes del carrito (RF-03). Precio y stock se leen siempre aquí, nunca
 * del navegador. Con el cliente público, las políticas RLS ocultan las variantes de productos
 * retirados: una variante que no se devuelve es una línea «no disponible» (CA-62).
 */

export const variantIdsSchema = z.array(z.string().uuid()).max(MAX_CART_LINES);

const SELECT =
  'id, size, color, price_cents, compare_at_cents, stock, ' +
  'products!inner(slug, name, product_images(path, alt, position))';

const rowSchema = z.object({
  id: z.string(),
  size: z.string(),
  color: z.string(),
  price_cents: z.number().int().nonnegative(),
  /** Precio anterior de la variante (T-075); `nullish` tolera filas sin la clave. */
  compare_at_cents: z.number().int().positive().nullish(),
  stock: z.number().int().nonnegative(),
  products: z.object({
    slug: z.string(),
    name: z.string(),
    product_images: z.array(
      z.object({
        path: productImagePathSchema,
        alt: z.string().min(1),
        position: z.number().int(),
      }),
    ),
  }),
});

export interface CartLineInfo {
  readonly variantId: string;
  readonly productName: string;
  readonly slug: string;
  readonly size: string;
  readonly color: string;
  readonly priceCents: number;
  /** Precio antes de la rebaja, o `null` si la variante no está rebajada (CA-126). */
  readonly compareAtCents: number | null;
  readonly stock: number;
  readonly image: { readonly path: string; readonly alt: string } | null;
}

export async function fetchCartLines(
  variantIds: readonly string[],
  client: PublicSupabaseClient = createPublicClient(),
): Promise<CartLineInfo[]> {
  const ids = variantIdsSchema.parse([...variantIds]);
  if (ids.length === 0) return [];

  const { data, error } = await client.from('product_variants').select(SELECT).in('id', ids);
  if (error) throw new Error(`No se pudo cargar el carrito: ${error.message}`);

  return z
    .array(rowSchema)
    .parse(data)
    .map((row) => {
      const images = [...row.products.product_images].sort((a, b) => a.position - b.position);
      const image = imageForColor({ images }, row.color);
      return {
        variantId: row.id,
        productName: row.products.name,
        slug: row.products.slug,
        size: row.size,
        color: row.color,
        priceCents: row.price_cents,
        compareAtCents: row.compare_at_cents ?? null,
        stock: row.stock,
        image: image ? { path: image.path, alt: image.alt } : null,
      };
    });
}
