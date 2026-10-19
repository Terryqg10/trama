'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/admin';
import { pickValues, type FormState } from '@/lib/auth/form-state';
import { fieldErrors, formDataToObject } from '@/lib/auth/schemas';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createProduct,
  createVariant,
  deleteVariant,
  setProductActive,
  updateProduct,
  updateVariant,
  type WriteResult,
} from './products';
import { productSchema, uuidSchema, variantSchema, variantUpdateSchema } from './product-schemas';

const DENIED: FormState = { status: 'error', message: 'No tienes permiso para esta acción.' };
const GENERIC: FormState = { status: 'error', message: 'No se ha podido guardar. Inténtalo de nuevo.' };

const PRODUCT_FIELDS = [
  'name',
  'slug',
  'description',
  'gender',
  'category',
  'occasion',
  'isNew',
  'composition',
  'care',
  'modelHeightCm',
  'modelSize',
] as const;

/** Sesión de admin para las acciones: sin sesión redirige al acceso; sin rol admin devuelve `null`. */
async function adminContext() {
  const { client, user } = await getCurrentUser();
  if (!user) redirect('/acceso');
  return (await isAdmin(client, user.id)) ? client : null;
}

function refresh(productId?: string): void {
  revalidatePath('/admin/productos');
  if (productId) revalidatePath(`/admin/productos/${productId}`);
}

function failure(result: WriteResult<unknown>): FormState {
  if (result.status === 'denied') return DENIED;
  if (result.status === 'notFound') return { status: 'error', message: 'Ese elemento ya no existe. Recarga la página.' };
  return GENERIC;
}

/** Crea (sin `id`) o edita (con `id`) un producto. Del formulario solo se leen los campos del esquema. */
export async function saveProductAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = productSchema.safeParse(raw);
  const idText = raw['id'];
  const id = idText === undefined || idText === '' ? null : uuidSchema.safeParse(idText);
  if (id !== null && !id.success) return GENERIC;
  const values = pickValues(raw, PRODUCT_FIELDS);

  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };

  const client = await adminContext();
  if (!client) return DENIED;

  if (id === null) {
    const created = await createProduct(client, parsed.data);
    if (created.status === 'duplicate') {
      return { status: 'error', fieldErrors: { slug: 'Ya existe un producto con esa URL.' }, values };
    }
    if (created.status !== 'ok') return { ...failure(created), values };
    refresh(created.value.id);
    redirect(`/admin/productos/${created.value.id}`);
  }

  const updated = await updateProduct(client, id.data, parsed.data);
  if (updated.status === 'duplicate') {
    return { status: 'error', fieldErrors: { slug: 'Ya existe un producto con esa URL.' }, values };
  }
  if (updated.status !== 'ok') return { ...failure(updated), values };
  refresh(id.data);
  return { status: 'success', message: 'Producto guardado.', values };
}

/** Desactiva (baja) o reactiva un producto. */
export async function setProductActiveAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const id = uuidSchema.safeParse(raw['id']);
  if (!id.success) return GENERIC;
  const client = await adminContext();
  if (!client) return DENIED;

  const active = raw['active'] === 'true';
  const result = await setProductActive(client, id.data, active);
  if (result.status !== 'ok') return failure(result);
  refresh(id.data);
  return { status: 'success', message: active ? 'Producto reactivado.' : 'Producto desactivado: ya no se ve en la tienda.' };
}

/** Añade una variante (con `productId`) o actualiza el precio y el stock de una existente (con `variantId`). */
export async function saveVariantAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const productId = uuidSchema.safeParse(raw['productId']);
  if (!productId.success) return GENERIC;
  const variantIdText = raw['variantId'];
  const variantId = variantIdText === undefined || variantIdText === '' ? null : uuidSchema.safeParse(variantIdText);
  if (variantId !== null && !variantId.success) return GENERIC;

  const client = await adminContext();
  if (!client) return DENIED;

  if (variantId === null) {
    const parsed = variantSchema.safeParse(raw);
    const values = pickValues(raw, ['size', 'color', 'price', 'stock']);
    if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };
    const created = await createVariant(client, productId.data, parsed.data);
    if (created.status === 'duplicate') {
      return { status: 'error', message: 'Ya existe una variante con esa talla y ese color.', values };
    }
    if (created.status !== 'ok') return { ...failure(created), values };
    refresh(productId.data);
    return { status: 'success', message: 'Variante añadida.' };
  }

  const parsed = variantUpdateSchema.safeParse(raw);
  const values = pickValues(raw, ['price', 'stock']);
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };
  const updated = await updateVariant(client, variantId.data, parsed.data);
  if (updated.status !== 'ok') return { ...failure(updated), values };
  refresh(productId.data);
  return { status: 'success', message: 'Guardado.' };
}

export async function deleteVariantAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const productId = uuidSchema.safeParse(raw['productId']);
  const variantId = uuidSchema.safeParse(raw['variantId']);
  if (!productId.success || !variantId.success) return GENERIC;
  const client = await adminContext();
  if (!client) return DENIED;

  const result = await deleteVariant(client, variantId.data);
  if (result.status !== 'ok') return failure(result);
  refresh(productId.data);
  return { status: 'success', message: 'Variante eliminada.' };
}
