import type { CatalogProduct } from '@/lib/catalog/product';
import { imageForColor, quickAddData } from '@/lib/catalog/quick-add';

/**
 * «Completa tu look» del carrito lateral (CA-153, T-121, Enmienda 49): básicos (polos y camisetas) que no están ya en el
 * carrito, hasta 3, con lo mínimo para mostrarlos y añadir una talla. Todo son datos públicos del catálogo.
 */

export const COMPLETE_LOOK_CATEGORIES = ['polos', 'camisetas'] as const;
export const COMPLETE_LOOK_COUNT = 3;

export interface CompleteLookSize {
  readonly variantId: string;
  readonly size: string;
  readonly stock: number;
}

export interface CompleteLookItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly fromPriceCents: number;
  readonly image: { readonly path: string; readonly alt: string } | null;
  readonly color: string;
  /** Tallas del color por defecto, ordenadas; las agotadas incluidas (se muestran tachadas). */
  readonly sizes: readonly CompleteLookSize[];
}

/**
 * Elige hasta `count` productos: con stock, que no estén en `excludedSlugs` (por producto, no por variante) y de los más
 * recientes a los más antiguos. Un producto sin nada que comprar no entra.
 */
export function pickCompleteLook(
  products: readonly CatalogProduct[],
  excludedSlugs: ReadonlySet<string>,
  count: number = COMPLETE_LOOK_COUNT,
): CompleteLookItem[] {
  const items: CompleteLookItem[] = [];
  const candidates = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.slug.localeCompare(b.slug));
  for (const product of candidates) {
    if (items.length >= count) break;
    if (excludedSlugs.has(product.slug)) continue;
    const quick = quickAddData(product);
    if (quick === null) continue;
    const sizes = quick.colors.find((entry) => entry.color === quick.defaultColor)?.sizes ?? [];
    const image = imageForColor(product.images, quick.defaultColor);
    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      fromPriceCents: product.fromPriceCents,
      image: image ? { path: image.path, alt: image.alt } : null,
      color: quick.defaultColor,
      sizes,
    });
  }
  return items;
}
