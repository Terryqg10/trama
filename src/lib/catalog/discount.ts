import type { CatalogProduct } from './product';

/** Rebaja de una tarjeta de producto (CA-119, T-076). */
export interface CardDiscount {
  /** Porcentaje de descuento, entero y de 1 a 99. */
  readonly percent: number;
  readonly priceCents: number;
  readonly compareAtCents: number;
}

/** Porcentaje redondeado de rebaja entre el precio anterior y el actual; mínimo 1 para que nunca se muestre «-0%». */
export function discountPercent(priceCents: number, compareAtCents: number): number {
  return Math.min(99, Math.max(1, Math.round(((compareAtCents - priceCents) / compareAtCents) * 100)));
}

/**
 * Rebaja que enseña la tarjeta: la de la variante más barata (la del precio «desde») si tiene precio anterior mayor que el
 * actual. `null` sin rebaja. El dato real es `compare_at_cents` (T-075): no se inventa ningún descuento.
 */
export function cardDiscount(product: Pick<CatalogProduct, 'variants' | 'fromPriceCents'>): CardDiscount | null {
  for (const variant of product.variants) {
    if (variant.priceCents !== product.fromPriceCents) continue;
    const compareAt = variant.compareAtCents;
    if (compareAt === null || compareAt <= variant.priceCents) continue;
    return {
      percent: discountPercent(variant.priceCents, compareAt),
      priceCents: variant.priceCents,
      compareAtCents: compareAt,
    };
  }
  return null;
}

/** ¿Está en oferta? Alguna variante tiene precio anterior mayor que el actual (`compare_at_cents`, SPEC-005 RF-10, T-099). */
export function isOffer(product: Pick<CatalogProduct, 'variants'>): boolean {
  return product.variants.some((variant) => variant.compareAtCents !== null && variant.compareAtCents > variant.priceCents);
}

/** Mayor porcentaje de rebaja entre todas las variantes de los productos; `null` si ninguno tiene (CA-04, T-100). */
export function maxOfferPercent(products: readonly Pick<CatalogProduct, 'variants'>[]): number | null {
  let max: number | null = null;
  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.compareAtCents === null || variant.compareAtCents <= variant.priceCents) continue;
      const percent = discountPercent(variant.priceCents, variant.compareAtCents);
      if (max === null || percent > max) max = percent;
    }
  }
  return max;
}
