import { z } from 'zod';
import { createPublicClient, type PublicSupabaseClient } from '@/lib/supabase/server';
import { CATEGORIES, type Category } from './filters';

// Guía de tallas por categoría (SPEC-001 RF-18). Vive en `size_guides.content` (JSON). La BD no
// valida la forma del JSON, así que se valida aquí: un contenido que no la cumpla se trata como
// «sin guía» y la ficha no se rompe.

/** Una fila de la tabla: la talla y un valor por columna (texto: admite rangos como «88–92»). */
const rowSchema = z.object({
  size: z.string().min(1).max(8),
  values: z.array(z.string().min(1).max(24)).min(1).max(8),
});

export const sizeGuideSchema = z
  .object({
    /** Cabeceras de las columnas de medidas, p. ej. «Pecho (cm)». La primera columna es la talla. */
    columns: z.array(z.string().min(1).max(40)).min(1).max(8),
    rows: z.array(rowSchema).min(1).max(20),
    /** Aviso opcional bajo la tabla (p. ej. que las medidas son orientativas). */
    note: z.string().min(1).max(300).optional(),
  })
  .refine((guide) => guide.rows.every((row) => row.values.length === guide.columns.length), {
    message: 'Cada fila debe tener un valor por columna',
  });

export type SizeGuide = z.infer<typeof sizeGuideSchema>;

/** Valida el contenido guardado en BD: la guía, o `null` si no cumple la forma esperada. */
export function parseSizeGuide(content: unknown): SizeGuide | null {
  const parsed = sizeGuideSchema.safeParse(content);
  return parsed.success ? parsed.data : null;
}

/**
 * Devuelve la guía de tallas de una categoría, o `null` si no existe o su contenido no es
 * válido. Lectura pública (RLS). Un error de BD sí se propaga.
 */
export async function getSizeGuide(
  category: Category,
  client: PublicSupabaseClient = createPublicClient(),
): Promise<SizeGuide | null> {
  if (!CATEGORIES.includes(category)) return null;
  const { data, error } = await client
    .from('size_guides')
    .select('content')
    .eq('category', category)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la guía de tallas: ${error.message}`);
  if (!data) return null;
  return parseSizeGuide(data.content);
}
