import { z } from 'zod';
import { CATEGORIES, GENDERS, OCCASIONS } from '@/lib/catalog/filters';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import type { ProductInput, VariantInput, VariantUpdateInput } from './product-schemas';

/**
 * Productos, variantes y stock desde el panel admin (RF-09, CA-15, CA-16). Todas las operaciones usan el
 * cliente con la sesión del admin: las políticas RLS de `products` y `product_variants` solo dejan escribir a
 * un admin (CA-15), así que un no admin que llame a estas funciones recibe un rechazo de la base de datos.
 * La baja es desactivar (`active = false`): el producto conserva su historia.
 */

export const MAX_ADMIN_PRODUCTS = 100;

const PG_UNIQUE_VIOLATION = '23505';

const productRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  gender: z.enum(GENDERS),
  category: z.enum(CATEGORIES),
  occasion: z.enum(OCCASIONS),
  is_new: z.boolean(),
  composition: z.string().nullable(),
  care: z.string().nullable(),
  model_height_cm: z.number().int().nullable(),
  model_size: z.string().nullable(),
  active: z.boolean(),
});

const variantRowSchema = z.object({
  id: z.string(),
  size: z.string(),
  color: z.string(),
  price_cents: z.number().int(),
  stock: z.number().int(),
});

const PRODUCT_COLUMNS =
  'id, slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size, active';

export interface AdminProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly gender: (typeof GENDERS)[number];
  readonly category: (typeof CATEGORIES)[number];
  readonly occasion: (typeof OCCASIONS)[number];
  readonly isNew: boolean;
  readonly composition: string | null;
  readonly care: string | null;
  readonly modelHeightCm: number | null;
  readonly modelSize: string | null;
  readonly active: boolean;
}

export interface AdminVariant {
  readonly id: string;
  readonly size: string;
  readonly color: string;
  readonly priceCents: number;
  readonly stock: number;
}

export interface AdminProductSummary extends AdminProduct {
  readonly variantCount: number;
  readonly totalStock: number;
  readonly fromPriceCents: number | null;
}

function toProduct(row: z.infer<typeof productRowSchema>): AdminProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    gender: row.gender,
    category: row.category,
    occasion: row.occasion,
    isNew: row.is_new,
    composition: row.composition,
    care: row.care,
    modelHeightCm: row.model_height_cm,
    modelSize: row.model_size,
    active: row.active,
  };
}

function toVariant(row: z.infer<typeof variantRowSchema>): AdminVariant {
  return { id: row.id, size: row.size, color: row.color, priceCents: row.price_cents, stock: row.stock };
}

export async function listAdminProducts(client: PublicSupabaseClient): Promise<AdminProductSummary[]> {
  const { data, error } = await client
    .from('products')
    .select(`${PRODUCT_COLUMNS}, product_variants(id, size, color, price_cents, stock)`)
    .order('created_at', { ascending: false })
    .limit(MAX_ADMIN_PRODUCTS);
  if (error) throw new Error(`No se pudo cargar el listado de productos: ${error.message}`);

  return z
    .array(productRowSchema.extend({ product_variants: z.array(variantRowSchema) }))
    .parse(data)
    .map((row) => {
      const variants = row.product_variants;
      return {
        ...toProduct(row),
        variantCount: variants.length,
        totalStock: variants.reduce((sum, variant) => sum + variant.stock, 0),
        fromPriceCents: variants.length > 0 ? Math.min(...variants.map((variant) => variant.price_cents)) : null,
      };
    });
}

export async function getAdminProduct(
  client: PublicSupabaseClient,
  productId: string,
): Promise<{ product: AdminProduct; variants: AdminVariant[] } | null> {
  const id = z.string().uuid().safeParse(productId);
  if (!id.success) return null;

  const { data, error } = await client
    .from('products')
    .select(`${PRODUCT_COLUMNS}, product_variants(id, size, color, price_cents, stock)`)
    .eq('id', id.data)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el producto: ${error.message}`);
  if (!data) return null;

  const row = productRowSchema.extend({ product_variants: z.array(variantRowSchema) }).parse(data);
  const variants = row.product_variants.map(toVariant).sort((a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size, 'es', { numeric: true }));
  return { product: toProduct(row), variants };
}

export type WriteResult<T = undefined> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'duplicate' }
  | { readonly status: 'notFound' }
  | { readonly status: 'denied' }
  | { readonly status: 'error' };

function classify(error: { code?: string; message: string }): WriteResult<never> {
  if (error.code === PG_UNIQUE_VIOLATION) return { status: 'duplicate' };
  // 42501 = permiso denegado; la RLS rechaza la escritura de quien no es admin.
  if (error.code === '42501') return { status: 'denied' };
  console.error('products: la base de datos rechazó la operación', error.code ?? '', error.message);
  return { status: 'error' };
}

function productColumns(input: ProductInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    gender: input.gender,
    category: input.category,
    occasion: input.occasion,
    is_new: input.isNew,
    composition: input.composition,
    care: input.care,
    model_height_cm: input.modelHeightCm,
    model_size: input.modelSize,
  };
}

/** Crea un producto activo. Un slug repetido devuelve `duplicate`. */
export async function createProduct(
  client: PublicSupabaseClient,
  input: ProductInput,
): Promise<WriteResult<{ id: string }>> {
  const { data, error } = await client.from('products').insert(productColumns(input)).select('id').single();
  if (error) return classify(error);
  return { status: 'ok', value: { id: z.object({ id: z.string() }).parse(data).id } };
}

export async function updateProduct(
  client: PublicSupabaseClient,
  productId: string,
  input: ProductInput,
): Promise<WriteResult> {
  const { data, error } = await client
    .from('products')
    .update(productColumns(input))
    .eq('id', productId)
    .select('id');
  if (error) return classify(error);
  // La RLS filtra las filas que no puede tocar: sin filas actualizadas no existe o no hay permiso.
  return data.length === 0 ? { status: 'notFound' } : { status: 'ok', value: undefined };
}

/** Baja y reactivación: un producto inactivo desaparece del catálogo, del carrito y del checkout. */
export async function setProductActive(
  client: PublicSupabaseClient,
  productId: string,
  active: boolean,
): Promise<WriteResult> {
  const { data, error } = await client.from('products').update({ active }).eq('id', productId).select('id');
  if (error) return classify(error);
  return data.length === 0 ? { status: 'notFound' } : { status: 'ok', value: undefined };
}

export async function createVariant(
  client: PublicSupabaseClient,
  productId: string,
  input: VariantInput,
): Promise<WriteResult> {
  const { error } = await client.from('product_variants').insert({
    product_id: productId,
    size: input.size,
    color: input.color,
    price_cents: input.price,
    stock: input.stock,
  });
  if (error) return classify(error);
  return { status: 'ok', value: undefined };
}

export async function updateVariant(
  client: PublicSupabaseClient,
  variantId: string,
  input: VariantUpdateInput,
): Promise<WriteResult> {
  const { data, error } = await client
    .from('product_variants')
    .update({ price_cents: input.price, stock: input.stock })
    .eq('id', variantId)
    .select('id');
  if (error) return classify(error);
  return data.length === 0 ? { status: 'notFound' } : { status: 'ok', value: undefined };
}

export async function deleteVariant(client: PublicSupabaseClient, variantId: string): Promise<WriteResult> {
  const { data, error } = await client.from('product_variants').delete().eq('id', variantId).select('id');
  if (error) return classify(error);
  return data.length === 0 ? { status: 'notFound' } : { status: 'ok', value: undefined };
}
