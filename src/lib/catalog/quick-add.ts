import { compareSizes } from './facets';
import type { CatalogProduct, ProductImage } from './product';

/** Una talla de los controles de la tarjeta (CA-121, T-081). Con `stock` 0 se muestra tachada y no se puede elegir. */
export interface QuickAddSize {
  readonly variantId: string;
  readonly size: string;
  readonly stock: number;
}

export interface QuickAddColor {
  readonly color: string;
  /** Todas las tallas de ese color, ordenadas (XS…XXL y luego numéricas); las agotadas incluidas. */
  readonly sizes: readonly QuickAddSize[];
}

export interface QuickAddData {
  /** Color con el que arranca la tarjeta: el primero con stock. */
  readonly defaultColor: string;
  /** Todos los colores del producto, en su orden, cada uno con sus tallas. */
  readonly colors: readonly QuickAddColor[];
}

/**
 * Datos de los controles de compra de la tarjeta (miniaturas de color, tallas y botón). `null` si el producto está
 * agotado: sin nada que comprar no hay controles.
 */
export function quickAddData(product: Pick<CatalogProduct, 'colors' | 'variants'>): QuickAddData | null {
  const defaultColor = product.colors.find((candidate) =>
    product.variants.some((variant) => variant.color === candidate && variant.stock > 0),
  );
  if (defaultColor === undefined) return null;
  const colors = product.colors.map((color) => ({
    color,
    sizes: product.variants
      .filter((variant) => variant.color === color)
      .map((variant) => ({ variantId: variant.id, size: variant.size, stock: variant.stock }))
      .sort((a, b) => compareSizes(a.size, b.size)),
  }));
  return { defaultColor, colors };
}

/**
 * Imagen de la tarjeta para un color: la que acaba en «color <nombre>» (como en la ficha, `variant-selection.ts`); si no
 * hay, la primera. `undefined` sin imágenes.
 */
export function imageForColor(images: readonly ProductImage[], color: string): ProductImage | undefined {
  return images.find((image) => image.alt.toLowerCase().endsWith(`color ${color}`)) ?? images[0];
}
