'use client';

import { useEffect, useRef } from 'react';
import { mergeGuestCartAction } from './actions';
import { type SavedCart } from './cart';
import { readCart, writeCart } from './store';

// Solo una fusión a la vez en esta pestaña: navegar entre páginas con sesión no la repite.
let inFlight = false;

/**
 * Respaldo del cliente para fusionar el carrito del navegador con el de la cuenta (CA-04) cuando
 * se llega con sesión y quedan líneas locales. La vía normal es el propio inicio de sesión, que
 * fusiona en el servidor. Las líneas locales solo se borran cuando el servidor confirma, para no
 * perderlas si la página se cierra a medias.
 */
export function useGuestCartMerge(enabled: boolean, onMerged?: (cart: SavedCart) => void): void {
  const callback = useRef(onMerged);
  useEffect(() => {
    callback.current = onMerged;
  }, [onMerged]);

  useEffect(() => {
    if (!enabled || inFlight) return;
    const taken = readCart();
    if (taken.length === 0) return;
    inFlight = true;
    void mergeGuestCartAction(taken)
      .then((result) => {
        if (result.status !== 'ok') return;
        writeCart([]);
        callback.current?.(result.cart);
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
      });
  }, [enabled]);
}
