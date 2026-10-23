import { z } from 'zod';
import { requiredString } from '@/lib/zod-helpers';
import { CATEGORIES, GENDERS, OCCASIONS } from '@/lib/catalog/filters';

/**
 * Esquemas del panel de productos (RF-09). Reflejan los CHECK de `products` y `product_variants`: lo que
 * pasa aquí no debería rechazarlo la base de datos, y lo que no, se explica por campo antes de llegar a ella.
 */

const REQUIRED = 'Este campo es obligatorio.';

const text = (max: number) =>
  requiredString(REQUIRED)
    .trim()
    .min(1, REQUIRED)
    .max(max, `Máximo ${max} caracteres.`);

/** Texto opcional: vacío se guarda como `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value));

/** Casilla de formulario: llega `on` si está marcada y no llega nada si no. */
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === 'on' || value === 'true');

/** Entero opcional de un campo de texto: vacío es `null`; lo no numérico o fuera de rango es un error de campo. */
const optionalInt = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, context) => {
      if (value === undefined || value === '') return null;
      if (!/^[0-9]+$/.test(value)) {
        context.addIssue({ code: 'custom', message: `${label} debe ser un número entero.` });
        return z.NEVER;
      }
      const number = Number.parseInt(value, 10);
      if (number < min || number > max) {
        context.addIssue({ code: 'custom', message: `${label} debe estar entre ${min} y ${max}.` });
        return z.NEVER;
      }
      return number;
    });

export const slugSchema = requiredString(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .max(160, 'Máximo 160 caracteres.')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones, sin guiones al principio ni al final.');

/** Propone un slug a partir del nombre: sin tildes, en minúsculas y con guiones. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
}

export const productSchema = z.object({
  name: text(160),
  slug: slugSchema,
  description: optionalText(4000),
  gender: z.enum(GENDERS, { error: 'Elige un género.' }),
  category: z.enum(CATEGORIES, { error: 'Elige una categoría.' }),
  occasion: z.enum(OCCASIONS, { error: 'Elige una ocasión.' }),
  isNew: checkbox,
  composition: optionalText(500),
  care: optionalText(500),
  modelHeightCm: optionalInt(100, 250, 'La altura del modelo'),
  modelSize: optionalText(10),
});
export type ProductInput = z.infer<typeof productSchema>;

/**
 * Convierte un importe en euros escrito por una persona («29,90», «29.90», «30») en céntimos enteros.
 * Devuelve `null` si no es un importe válido (más de dos decimales, negativo, texto…). Nunca usa `float`
 * para el resultado (RNF-08).
 */
export function eurosToCents(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  const match = /^([0-9]{1,6})(?:\.([0-9]{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const euros = Number.parseInt(match[1] ?? '', 10);
  const cents = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);
  return euros * 100 + cents;
}

const priceField = requiredString(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .transform((value, context) => {
    const cents = eurosToCents(value);
    if (cents === null) {
      context.addIssue({ code: 'custom', message: 'Escribe un importe válido, por ejemplo 29,90.' });
      return z.NEVER;
    }
    if (cents < 1) {
      context.addIssue({ code: 'custom', message: 'El precio debe ser mayor que 0.' });
      return z.NEVER;
    }
    return cents;
  });

const stockField = requiredString(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .transform((value, context) => {
    if (!/^[0-9]{1,6}$/.test(value)) {
      context.addIssue({ code: 'custom', message: 'El stock debe ser un número entero, 0 o más.' });
      return z.NEVER;
    }
    return Number.parseInt(value, 10);
  });

export const variantSchema = z.object({
  size: text(10).transform((value) => value.toUpperCase()),
  color: text(40).transform((value) => value.toLowerCase()),
  price: priceField,
  stock: stockField,
});
export type VariantInput = z.infer<typeof variantSchema>;

/** Al editar una variante solo cambian el precio y el stock: la talla y el color la identifican. */
export const variantUpdateSchema = z.object({ price: priceField, stock: stockField });
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const uuidSchema = z.string().uuid();
