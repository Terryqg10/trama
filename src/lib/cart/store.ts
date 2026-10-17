'use client';

import { useSyncExternalStore } from 'react';
import { EMPTY_CART, parseSavedCart, type SavedCart } from './cart';

/**
 * Almacén del carrito de invitado en `localStorage` (RF-03). Solo guarda `{ variantId, qty }` bajo una
 * clave versionada. Todo acceso al almacenamiento va en try/catch: puede lanzar (modo privado,
 * datos de sitio bloqueados) y la página debe seguir funcionando con un carrito vacío.
 */
export const CART_STORAGE_KEY = 'trama.cart.v1';
const CART_EVENT = 'trama:cart-change';

let cachedRaw: string | null | undefined;
let cachedCart: SavedCart = EMPTY_CART;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Instantánea estable: solo se vuelve a parsear si el texto guardado ha cambiado. */
function getSnapshot(): SavedCart {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedCart = parseSavedCart(raw);
  }
  return cachedCart;
}

function getServerSnapshot(): SavedCart {
  return EMPTY_CART;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CART_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CART_EVENT, onChange);
  };
}

/** Guarda el carrito y avisa a los componentes de esta pestaña (las demás reciben `storage`). */
export function writeCart(cart: SavedCart): void {
  try {
    if (cart.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Sin almacenamiento disponible el cambio no se puede guardar; la interfaz sigue como estaba.
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

export function readCart(): SavedCart {
  return getSnapshot();
}

export function useSavedCart(): SavedCart {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** `false` en el servidor y durante la hidratación; `true` ya en el navegador. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
