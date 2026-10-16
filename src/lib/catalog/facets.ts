import { CATEGORIES, type Category } from './filters';
import type { CatalogProduct } from './product';

export interface CatalogFacets {
  /** Categorías presentes en el ámbito, en el orden canónico. */
  readonly categories: readonly Category[];
  /** Tallas con stock en el ámbito, ordenadas (XS…XXL y luego numéricas). */
  readonly sizes: readonly string[];
  /** Colores del ámbito, ordenados alfabéticamente. */
  readonly colors: readonly string[];
}

const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function compareSizes(a: string, b: string): number {
  const ia = LETTER_SIZES.indexOf(a);
  const ib = LETTER_SIZES.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1; // las tallas de letra van antes que las numéricas
  if (ib !== -1) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b, 'es');
}

/**
 * Deriva las opciones de filtro a partir de los productos del ámbito SIN filtrar
 * (género o novedades). Así las opciones no desaparecen al aplicar un filtro.
 */
export function deriveFacets(products: readonly CatalogProduct[]): CatalogFacets {
  const categories = new Set<Category>();
  const sizes = new Set<string>();
  const colors = new Set<string>();

  for (const product of products) {
    categories.add(product.category);
    for (const size of product.sizes) sizes.add(size);
    for (const color of product.colors) colors.add(color);
  }

  return {
    categories: CATEGORIES.filter((category) => categories.has(category)),
    sizes: [...sizes].sort(compareSizes),
    colors: [...colors].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
