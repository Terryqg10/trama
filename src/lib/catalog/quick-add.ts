import { compareSizes } from './facets';
import type { CatalogProduct } from './product';

/** Una talla del panel de compra rápida (CA-120, T-077). Con `stock` 0 se muestra tachada y no se puede elegir. */
export interface QuickAddSize {
  readonly variantId: string;
  readonly size: string;
  readonly stock: number;
}

export interface QuickAddData {
  readonly color: string;
  /** Todas las tallas de ese color, ordenadas (XS…XXL y luego numéricas); las agotadas incluidas. */
  readonly sizes: readonly QuickAddSize[];
  /** Cuántos colores más tiene el producto: se avisa «+N colores» y se eligen en la ficha. */
  readonly moreColors: number;
}

/**
 * Datos del panel de compra rápida: las tallas del **primer color con stock** (la foto de la tarjeta no está ligada a un
 * color; Enmienda 32). `null` si el producto está agotado: sin nada que comprar no hay panel.
 */
export function quickAddData(product: Pick<CatalogProduct, 'colors' | 'variants'>): QuickAddData | null {
  const color = product.colors.find((candidate) =>
    product.variants.some((variant) => variant.color === candidate && variant.stock > 0),
  );
  if (color === undefined) return null;
  const sizes = product.variants
    .filter((variant) => variant.color === color)
    .map((variant) => ({ variantId: variant.id, size: variant.size, stock: variant.stock }))
    .sort((a, b) => compareSizes(a.size, b.size));
  return { color, sizes, moreColors: product.colors.length - 1 };
}
