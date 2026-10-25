'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAccountCartAction } from './actions';
import type { SavedCart } from './cart';
import { useSavedCart } from './store';

/**
 * Contador de unidades del icono de la cesta (RF-18, CA-21 a CA-24, T-108). El carrito de invitado está en `localStorage`
 * (`useSavedCart`) y el de la cuenta en la BD: con sesión se pregunta a `getAccountCartAction` al montar la cabecera y en
 * cada cambio de ruta, y los puntos que modifican el carrito de la cuenta avisan con `announceAccountCart` (sin otra consulta).
 * Al cerrar sesión se avisa con `null` y vuelve a contar el carrito del navegador.
 */

const ACCOUNT_COUNT_EVENT = 'trama:cart-account-count';

/** Unidades del carrito (suma de cantidades, no de líneas). */
export function totalQty(cart: SavedCart): number {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

/** Texto del badge: `null` (oculto) sin unidades, la cifra hasta 9 y «9+» desde 10. */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}

/** Nombre accesible del enlace de la cesta: sin unidades, «Carrito»; con ellas, «Carrito, N artículo(s)». */
export function cartLinkLabel(count: number): string {
  if (count <= 0) return 'Carrito';
  return `Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}`;
}

/** Un punto que cambió el carrito de la cuenta avisa al contador con el carrito resultante (o `null` al cerrar sesión). */
export function announceAccountCart(cart: SavedCart | null): void {
  window.dispatchEvent(new CustomEvent<number | null>(ACCOUNT_COUNT_EVENT, { detail: cart === null ? null : totalQty(cart) }));
}

export function useCartCount(): number {
  const pathname = usePathname();
  const guestCount = totalQty(useSavedCart());
  // `null`: sin sesión (cuenta el navegador); un número: unidades del carrito de la cuenta.
  const [accountCount, setAccountCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAccountCartAction()
      .then((result) => {
        if (cancelled) return;
        setAccountCount(result.status === 'ok' ? totalQty(result.cart) : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function onAnnounce(event: Event): void {
      if (event instanceof CustomEvent) setAccountCount(typeof event.detail === 'number' ? event.detail : null);
    }
    window.addEventListener(ACCOUNT_COUNT_EVENT, onAnnounce);
    return () => window.removeEventListener(ACCOUNT_COUNT_EVENT, onAnnounce);
  }, []);

  return accountCount ?? guestCount;
}
