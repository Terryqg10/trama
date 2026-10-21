import { z } from 'zod';
import { productImagePathSchema } from './image-path';
import { CATEGORIES, GENDERS, OCCASIONS, type Sort } from './filters';

const imageRowSchema = z.object({
  path: productImagePathSchema,
  alt: z.string().min(1),
  position: z.number().int(),
});

const variantRowSchema = z.object({
  id: z.string(),
  size: z.string(),
  color: z.string(),
  price_cents: z.number().int().nonnegative(),
  /**
   * Precio antes de la rebaja (T-075, CA-118): opcional y siempre mayor que `price_cents` (CHECK en la BD). La BD lo
   * devuelve siempre (`null` sin rebaja); `nullish` tolera filas sin la clave y se normaliza a `null` abajo.
   */
  compare_at_cents: z.number().int().positive().nullish(),
  stock: z.number().int().nonnegative(),
});

/** Fila del listado tal y como llega de la BD (validada, nunca confiada). */
export const catalogRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  gender: z.enum(GENDERS),
  category: z.enum(CATEGORIES),
  occasion: z.enum(OCCASIONS),
  is_new: z.boolean(),
  created_at: z.string(),
  product_images: z.array(imageRowSchema),
  product_variants: z.array(variantRowSchema),
});

/** Fila de la ficha: además del listado, descripción y datos de ajuste (RF-20). */
export const productDetailRowSchema = catalogRowSchema.extend({
  description: z.string().nullable(),
  composition: z.string().nullable(),
  care: z.string().nullable(),
  model_height_cm: z.number().int().nullable(),
  model_size: z.string().nullable(),
});

export interface ProductImage {
  readonly path: string;
  readonly alt: string;
}

export interface ProductVariant {
  readonly id: string;
  readonly size: string;
  readonly color: string;
  readonly priceCents: number;
  /** Precio antes de la rebaja; `null` si la variante no está rebajada. */
  readonly compareAtCents: number | null;
  readonly stock: number;
}

export interface CatalogProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly gender: (typeof GENDERS)[number];
  readonly category: (typeof CATEGORIES)[number];
  readonly occasion: (typeof OCCASIONS)[number];
  readonly isNew: boolean;
  readonly createdAt: string;
  /** Precio "desde": el menor entre las variantes devueltas. */
  readonly fromPriceCents: number;
  readonly images: readonly ProductImage[];
  readonly colors: readonly string[];
  /** Tallas con stock disponible. */
  readonly sizes: readonly string[];
  readonly variants: readonly ProductVariant[];
  /** Hay al menos una variante con stock. */
  readonly inStock: boolean;
}

export interface ProductDetail extends CatalogProduct {
  readonly description: string | null;
  readonly composition: string | null;
  readonly care: string | null;
  readonly modelHeightCm: number | null;
  readonly modelSize: string | null;
}

type CatalogRow = z.infer<typeof catalogRowSchema>;
type ProductDetailRow = z.infer<typeof productDetailRowSchema>;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function toCatalogProduct(row: CatalogRow): CatalogProduct {
  const variants: ProductVariant[] = row.product_variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    priceCents: v.price_cents,
    compareAtCents: v.compare_at_cents ?? null,
    stock: v.stock,
  }));
  const prices = variants.map((v) => v.priceCents);
  const available = variants.filter((v) => v.stock > 0);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    gender: row.gender,
    category: row.category,
    occasion: row.occasion,
    isNew: row.is_new,
    createdAt: row.created_at,
    fromPriceCents: prices.length > 0 ? Math.min(...prices) : 0,
    images: [...row.product_images]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({ path: image.path, alt: image.alt })),
    colors: unique(variants.map((v) => v.color)),
    sizes: unique(available.map((v) => v.size)),
    variants,
    inStock: available.length > 0,
  };
}

export function toProductDetail(row: ProductDetailRow): ProductDetail {
  return {
    ...toCatalogProduct(row),
    description: row.description,
    composition: row.composition,
    care: row.care,
    modelHeightCm: row.model_height_cm,
    modelSize: row.model_size,
  };
}

/**
 * Ordena sin modificar el original. "novedades": primero los nuevos, luego los
 * más recientes. Empates por nombre, para que el orden sea estable y predecible.
 */
export function sortProducts(products: readonly CatalogProduct[], sort: Sort): CatalogProduct[] {
  const byName = (a: CatalogProduct, b: CatalogProduct) => a.name.localeCompare(b.name, 'es');
  const copy = [...products];

  switch (sort) {
    case 'precio-asc':
      return copy.sort((a, b) => a.fromPriceCents - b.fromPriceCents || byName(a, b));
    case 'precio-desc':
      return copy.sort((a, b) => b.fromPriceCents - a.fromPriceCents || byName(a, b));
    case 'novedades':
      return copy.sort(
        (a, b) =>
          Number(b.isNew) - Number(a.isNew) ||
          b.createdAt.localeCompare(a.createdAt) ||
          byName(a, b),
      );
  }
}
