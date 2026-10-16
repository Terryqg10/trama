import { z } from 'zod';

export const GENDERS = ['hombre', 'mujer'] as const;
export const CATEGORIES = ['polos', 'camisas', 'blusas', 'pantalones'] as const;
export const OCCASIONS = ['casual', 'vestir'] as const;
export const SORTS = ['novedades', 'precio-asc', 'precio-desc'] as const;

export type Gender = (typeof GENDERS)[number];
export type Category = (typeof CATEGORIES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type Sort = (typeof SORTS)[number];

export interface CatalogFilters {
  gender?: Gender;
  category?: Category;
  occasion?: Occasion;
  size?: string;
  color?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  onlyNew: boolean;
  sort: Sort;
}

/** Valores sin filtrar: lo que entrega Next.js en `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

// Los parámetros de la URL van en español (es-ES). Los importes, en euros enteros.
const euros = z
  .string()
  .regex(/^\d{1,5}$/)
  .transform((value) => Number(value) * 100);

const paramsSchema = z.object({
  genero: z.enum(GENDERS).optional(),
  categoria: z.enum(CATEGORIES).optional(),
  ocasion: z.enum(OCCASIONS).optional(),
  talla: z
    .string()
    .regex(/^[A-Za-z0-9]{1,5}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  color: z
    .string()
    .regex(/^[A-Za-z]{3,20}$/)
    .transform((value) => value.toLowerCase())
    .optional(),
  min: euros.optional(),
  max: euros.optional(),
  novedades: z.literal('1').optional(),
  orden: z.enum(SORTS).optional(),
});

type ParamKey = keyof typeof paramsSchema.shape;
const KNOWN_PARAMS = Object.keys(paramsSchema.shape) as ParamKey[];

/**
 * Valida los parámetros de búsqueda del catálogo (SPEC-002 RF-09). Cada parámetro
 * se valida por separado: los desconocidos (p. ej. utm_*), los repetidos y los de
 * valor no permitido se IGNORAN y el resto se aplica. Nunca falla ni lanza. Si el
 * mínimo supera al máximo, se ignora el mínimo.
 */
export function parseCatalogParams(raw: RawSearchParams): CatalogFilters {
  const picked: Partial<Record<ParamKey, string>> = {};
  for (const key of KNOWN_PARAMS) {
    const value = raw[key];
    if (typeof value !== 'string' || value === '') continue;
    if (paramsSchema.shape[key].safeParse(value).success) picked[key] = value;
  }

  const parsed = paramsSchema.safeParse(picked);
  const p = parsed.success ? parsed.data : {};

  const filters: CatalogFilters = {
    onlyNew: p.novedades === '1',
    sort: p.orden ?? 'novedades',
  };
  if (p.genero) filters.gender = p.genero;
  if (p.categoria) filters.category = p.categoria;
  if (p.ocasion) filters.occasion = p.ocasion;
  if (p.talla) filters.size = p.talla;
  if (p.color) filters.color = p.color;
  if (p.max !== undefined) filters.maxPriceCents = p.max;
  if (p.min !== undefined && (p.max === undefined || p.min <= p.max)) {
    filters.minPriceCents = p.min;
  }
  return filters;
}
