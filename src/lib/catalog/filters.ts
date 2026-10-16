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

export type FilterParseResult =
  | { readonly ok: true; readonly filters: CatalogFilters }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Valores sin filtrar: lo que entrega Next.js en `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

// Los parámetros de la URL van en español (es-ES). Los importes, en euros enteros.
const euros = z
  .string()
  .regex(/^\d{1,5}$/, 'debe ser un importe en euros enteros')
  .transform((value) => Number(value) * 100);

// Mensaje en español para los valores fuera de la lista permitida (la tienda es solo es-ES).
const allowed = (values: readonly string[]) => ({
  errorMap: () => ({ message: `valor no permitido (opciones: ${values.join(', ')})` }),
});

const paramsSchema = z.object({
  genero: z.enum(GENDERS, allowed(GENDERS)).optional(),
  categoria: z.enum(CATEGORIES, allowed(CATEGORIES)).optional(),
  ocasion: z.enum(OCCASIONS, allowed(OCCASIONS)).optional(),
  talla: z
    .string()
    .regex(/^[A-Za-z0-9]{1,5}$/, 'talla no válida')
    .transform((value) => value.toUpperCase())
    .optional(),
  color: z
    .string()
    .regex(/^[A-Za-z]{3,20}$/, 'color no válido')
    .transform((value) => value.toLowerCase())
    .optional(),
  min: euros.optional(),
  max: euros.optional(),
  novedades: z.literal('1', { errorMap: () => ({ message: 'solo se admite 1' }) }).optional(),
  orden: z.enum(SORTS, allowed(SORTS)).optional(),
});

const KNOWN_PARAMS = Object.keys(paramsSchema.shape);

/**
 * Valida los parámetros de búsqueda del catálogo. Los parámetros desconocidos
 * (p. ej. utm_*) se ignoran, pero un parámetro conocido con un valor no permitido
 * se RECHAZA con un error: no se descarta en silencio.
 */
export function parseCatalogParams(raw: RawSearchParams): FilterParseResult {
  const errors: string[] = [];
  const picked: Record<string, string> = {};

  for (const key of KNOWN_PARAMS) {
    const value = raw[key];
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      errors.push(`${key}: parámetro repetido`);
      continue;
    }
    picked[key] = value;
  }

  const parsed = paramsSchema.safeParse(picked);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }
  if (errors.length > 0 || !parsed.success) return { ok: false, errors };

  const p = parsed.data;
  if (p.min !== undefined && p.max !== undefined && p.min > p.max) {
    return { ok: false, errors: ['min: no puede ser mayor que max'] };
  }

  const filters: CatalogFilters = {
    onlyNew: p.novedades === '1',
    sort: p.orden ?? 'novedades',
  };
  if (p.genero) filters.gender = p.genero;
  if (p.categoria) filters.category = p.categoria;
  if (p.ocasion) filters.occasion = p.ocasion;
  if (p.talla) filters.size = p.talla;
  if (p.color) filters.color = p.color;
  if (p.min !== undefined) filters.minPriceCents = p.min;
  if (p.max !== undefined) filters.maxPriceCents = p.max;
  return { ok: true, filters };
}
