import { z } from 'zod';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { maxQty, mergeCarts, savedCartSchema, type SavedCart } from './cart';
import { fetchCartLines } from './lines';

/**
 * Carrito de la cuenta (RF-03, T-031). Todas las funciones reciben el cliente con la sesión del
 * cliente: las políticas RLS de `carts` y `cart_items` limitan cada operación a su dueño. Nunca se
 * usa la clave de servicio. La cantidad que llega del navegador no se confía: se recorta al stock.
 */

const itemRowSchema = z.array(z.object({ variant_id: z.string(), qty: z.number().int() }));
const cartIdSchema = z.object({ id: z.string() });

export async function loadAccountCart(client: PublicSupabaseClient): Promise<SavedCart> {
  const { data, error } = await client.from('cart_items').select('variant_id, qty').order('variant_id');
  if (error) throw new Error(`No se pudo cargar el carrito de la cuenta: ${error.message}`);
  return itemRowSchema
    .parse(data)
    .filter((row) => row.qty >= 1)
    .map((row) => ({ variantId: row.variant_id, qty: row.qty }));
}

async function ensureCartId(client: PublicSupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client
    .from('carts')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('id')
    .single();
  if (error) throw new Error(`No se pudo abrir el carrito de la cuenta: ${error.message}`);
  return cartIdSchema.parse(data).id;
}

/**
 * Guarda el carrito de la cuenta tal y como queda. Las variantes que ya no existen se descartan y las
 * cantidades se recortan al stock. Devuelve lo realmente guardado.
 */
export async function saveAccountCart(
  client: PublicSupabaseClient,
  userId: string,
  cart: SavedCart,
): Promise<SavedCart> {
  const parsed = savedCartSchema.parse([...cart]);
  const infos = await fetchCartLines(
    parsed.map((line) => line.variantId),
    client,
  );
  const stockById = new Map(infos.map((info) => [info.variantId, info.stock]));

  const normalized: SavedCart = parsed.flatMap((line) => {
    const stock = stockById.get(line.variantId);
    if (stock === undefined) return [];
    const qty = Math.min(line.qty, maxQty(stock));
    return qty >= 1 ? [{ variantId: line.variantId, qty }] : [];
  });

  const cartId = await ensureCartId(client, userId);

  const existing = await client.from('cart_items').select('variant_id').eq('cart_id', cartId);
  if (existing.error) throw new Error(`No se pudo leer el carrito de la cuenta: ${existing.error.message}`);
  const keep = new Set(normalized.map((line) => line.variantId));
  const stale = z
    .array(z.object({ variant_id: z.string() }))
    .parse(existing.data)
    .map((row) => row.variant_id)
    .filter((variantId) => !keep.has(variantId));
  if (stale.length > 0) {
    const removed = await client.from('cart_items').delete().eq('cart_id', cartId).in('variant_id', stale);
    if (removed.error) throw new Error(`No se pudo actualizar el carrito de la cuenta: ${removed.error.message}`);
  }

  if (normalized.length > 0) {
    const upserted = await client.from('cart_items').upsert(
      normalized.map((line) => ({ cart_id: cartId, variant_id: line.variantId, qty: line.qty })),
      { onConflict: 'cart_id,variant_id' },
    );
    if (upserted.error) throw new Error(`No se pudo guardar el carrito de la cuenta: ${upserted.error.message}`);
  }

  return normalized;
}

/** Fusiona las líneas del invitado con las de la cuenta (CA-04) y guarda el resultado. */
export async function mergeGuestIntoAccount(
  client: PublicSupabaseClient,
  userId: string,
  guest: SavedCart,
): Promise<SavedCart> {
  const account = await loadAccountCart(client);
  return saveAccountCart(client, userId, mergeCarts(account, guest));
}
