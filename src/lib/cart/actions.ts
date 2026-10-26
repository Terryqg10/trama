'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { listProducts } from '@/lib/catalog/queries';
import { loadAccountCart, mergeGuestIntoAccount, saveAccountCart } from './account';
import { addToCart, MAX_CART_LINES, savedCartSchema, type SavedCart } from './cart';
import { COMPLETE_LOOK_CATEGORIES, pickCompleteLook, type CompleteLookItem } from './complete-look';
import { fetchCartLines, variantIdsSchema, type CartLineInfo } from './lines';
import { z } from 'zod';

export type CartLinesResult =
  | { readonly status: 'ok'; readonly lines: readonly CartLineInfo[] }
  | { readonly status: 'error' };

/** Precio, stock y datos actuales de las variantes del carrito (entrada validada con Zod). */
export async function getCartLinesAction(variantIds: readonly string[]): Promise<CartLinesResult> {
  const parsed = variantIdsSchema.safeParse(variantIds);
  if (!parsed.success) return { status: 'error' };
  try {
    return { status: 'ok', lines: await fetchCartLines(parsed.data) };
  } catch (error) {
    console.error('getCartLinesAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error' };
  }
}

export type AccountCartResult =
  | { readonly status: 'ok'; readonly cart: SavedCart }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'error' };

function logFailure(name: string, error: unknown): void {
  console.error(`${name} falló`, error instanceof Error ? error.message : 'error desconocido');
}

/**
 * Carrito de la cuenta, o `unauthenticated` si no hay sesión. El carrito lateral (T-085) lo usa al abrirse para saber si
 * trabaja con la cuenta o con el navegador, sin que el layout tenga que leer la sesión. No recibe parámetros.
 */
export async function getAccountCartAction(): Promise<AccountCartResult> {
  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'unauthenticated' };
  try {
    return { status: 'ok', cart: await loadAccountCart(client) };
  } catch (error) {
    logFailure('getAccountCartAction', error);
    return { status: 'error' };
  }
}

/** Guarda en la cuenta el carrito tal y como lo deja el cliente (cantidades recortadas al stock). */
export async function saveAccountCartAction(lines: SavedCart): Promise<AccountCartResult> {
  const parsed = savedCartSchema.safeParse(lines);
  if (!parsed.success) return { status: 'error' };
  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'unauthenticated' };
  try {
    return { status: 'ok', cart: await saveAccountCart(client, user.id, parsed.data) };
  } catch (error) {
    logFailure('saveAccountCartAction', error);
    return { status: 'error' };
  }
}

/** Fusiona el carrito del invitado con el de la cuenta al iniciar sesión (CA-04). */
export async function mergeGuestCartAction(lines: SavedCart): Promise<AccountCartResult> {
  const parsed = savedCartSchema.safeParse(lines);
  if (!parsed.success) return { status: 'error' };
  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'unauthenticated' };
  try {
    return { status: 'ok', cart: await mergeGuestIntoAccount(client, user.id, parsed.data) };
  } catch (error) {
    logFailure('mergeGuestCartAction', error);
    return { status: 'error' };
  }
}

export type AddToAccountResult =
  | { readonly status: 'ok'; readonly cart: SavedCart; readonly capped: boolean; readonly stock: number }
  | { readonly status: 'unavailable' }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'error' };

/** Añade una unidad de una variante al carrito de la cuenta (CA-60, CA-63). El stock lo lee el servidor. */
export async function addToAccountCartAction(variantId: string): Promise<AddToAccountResult> {
  const parsed = z.string().uuid().safeParse(variantId);
  if (!parsed.success) return { status: 'error' };
  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'unauthenticated' };
  try {
    const [info] = await fetchCartLines([parsed.data], client);
    if (!info) return { status: 'unavailable' };
    const current = await loadAccountCart(client);
    const change = addToCart(current, parsed.data, info.stock);
    const saved = await saveAccountCart(client, user.id, change.cart);
    return { status: 'ok', cart: saved, capped: change.capped, stock: info.stock };
  } catch (error) {
    logFailure('addToAccountCartAction', error);
    return { status: 'error' };
  }
}

const productSlugsSchema = z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)).max(MAX_CART_LINES);

export type CompleteLookResult =
  | { readonly status: 'ok'; readonly items: CompleteLookItem[] }
  | { readonly status: 'error' };

/**
 * «Completa tu look» del carrito lateral (CA-153, T-121): hasta 3 básicos (polos y camisetas) que no están ya en el carrito.
 * Del navegador solo llegan los `slug` de los productos del carrito (validados con Zod) para excluirlos; todo lo demás sale del
 * catálogo público.
 */
export async function getCompleteLookAction(cartSlugs: string[]): Promise<CompleteLookResult> {
  const parsed = productSlugsSchema.safeParse(cartSlugs);
  if (!parsed.success) return { status: 'error' };
  try {
    const groups = await Promise.all(COMPLETE_LOOK_CATEGORIES.map((category) => listProducts({ category, onlyNew: false, sort: 'novedades' })));
    return { status: 'ok', items: pickCompleteLook(groups.flat(), new Set(parsed.data)) };
  } catch (error) {
    logFailure('getCompleteLookAction', error);
    return { status: 'error' };
  }
}
