import { z } from 'zod';
import { compareSizes } from './facets';
import type { ProductDetail, ProductImage, ProductVariant } from './product';
import type { RawSearchParams } from './filters';

// Selección de color y talla en la ficha (SPEC-001 RF-02, CA-03). Vive en la URL
// (`?color=azul&talla=M`): funciona sin JavaScript y se puede compartir. Los valores
// que no corresponden a una variante de este producto se ignoran (como en el listado).

const paramsSchema = z.object({
  color: z
    .string()
    .regex(/^[A-Za-z]{3,20}$/)
    .transform((value) => value.toLowerCase())
    .optional(),
  talla: z
    .string()
    .regex(/^[A-Za-z0-9]{1,5}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
});

export interface SizeOption {
  readonly size: string;
  readonly stock: number;
  /** `false` si no hay stock: se muestra deshabilitada y no se puede elegir. */
  readonly available: boolean;
}

export interface VariantSelection {
  readonly colors: readonly string[];
  readonly color: string;
  /** Tallas del color elegido, ordenadas (XS…XXL y luego numéricas). */
  readonly sizes: readonly SizeOption[];
  /** Talla elegida, o `null` si aún no se ha elegido ninguna disponible. */
  readonly size: string | null;
  /** Variante elegida (color y talla), o `null` si falta la talla. */
  readonly variant: ProductVariant | null;
  readonly image: ProductImage | null;
}

function pick(raw: RawSearchParams, key: 'color' | 'talla'): string | undefined {
  const value = raw[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Imagen del color: el seed nombra la imagen «<nombre>, color <color>». Si no hay, la primera. */
export function imageForColor(product: ProductDetail, color: string): ProductImage | null {
  const match = product.images.find((image) => image.alt.toLowerCase().endsWith(`color ${color}`));
  return match ?? product.images[0] ?? null;
}

/**
 * Resuelve qué color y talla están elegidos. Color por defecto: el primero con stock (o el
 * primero). Una talla sin stock o que no existe en el color no se puede elegir y se ignora.
 */
export function resolveSelection(product: ProductDetail, raw: RawSearchParams): VariantSelection {
  const parsed = {
    color: paramsSchema.shape.color.safeParse(pick(raw, 'color')),
    talla: paramsSchema.shape.talla.safeParse(pick(raw, 'talla')),
  };
  const wantedColor = parsed.color.success ? parsed.color.data : undefined;
  const wantedSize = parsed.talla.success ? parsed.talla.data : undefined;

  const colors = product.colors;
  const defaultColor =
    colors.find((color) => product.variants.some((v) => v.color === color && v.stock > 0)) ??
    colors[0] ??
    '';
  const color = wantedColor && colors.includes(wantedColor) ? wantedColor : defaultColor;

  const sizes: SizeOption[] = product.variants
    .filter((variant) => variant.color === color)
    .map((variant) => ({
      size: variant.size,
      stock: variant.stock,
      available: variant.stock > 0,
    }))
    .sort((a, b) => compareSizes(a.size, b.size));

  const chosen = sizes.find((option) => option.size === wantedSize && option.available);
  const size = chosen ? chosen.size : null;
  const variant = size
    ? (product.variants.find((v) => v.color === color && v.size === size) ?? null)
    : null;

  return { colors, color, sizes, size, variant, image: imageForColor(product, color) };
}
