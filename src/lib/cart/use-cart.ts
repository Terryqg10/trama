'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCartLinesAction, saveAccountCartAction } from './actions';
import { maxQty, removeLine, savingsCents, setLineQty, summarize, type CartTotals, type SavedCart, type SavedLine } from './cart';
import type { CartLineInfo } from './lines';
import { useHydrated, useSavedCart, writeCart } from './store';
import { useGuestCartMerge } from './use-guest-merge';

interface Loaded {
  /** Variantes por las que se preguntó al servidor (estén o no en el resultado). */
  readonly requested: ReadonlySet<string>;
  readonly lines: ReadonlyMap<string, CartLineInfo>;
  readonly failed: boolean;
}

export interface CartNotice {
  /** Línea a la que se refiere el aviso; `null` si es del carrito entero. */
  readonly variantId: string | null;
  readonly text: string;
}

export interface CartLineState {
  readonly saved: SavedLine;
  readonly info: CartLineInfo | null;
  /** `missing`: el servidor no la devuelve; `soldOut`: sin stock; `ok`: cuenta en los totales. */
  readonly state: 'missing' | 'soldOut' | 'ok';
  /** Cantidad efectiva (limitada al stock); 0 si no cuenta. */
  readonly qty: number;
}

export type CartStatus = 'loading' | 'empty' | 'failed' | 'ready';

export interface UseCart {
  readonly hydrated: boolean;
  readonly isAccount: boolean;
  readonly saved: SavedCart;
  readonly status: CartStatus;
  readonly lines: readonly CartLineState[];
  readonly totals: CartTotals;
  /** Lo que se ahorra con las rebajas de las líneas que cuentan (CA-126). */
  readonly savingsCents: number;
  readonly notice: CartNotice | null;
  readonly change: (variantId: string, requested: number, info: CartLineInfo) => void;
  readonly remove: (variantId: string, name: string) => void;
  readonly retry: () => void;
}

/**
 * Estado del carrito compartido por la página `/carrito` y el carrito lateral (RF-03, RF-15; T-084). Las líneas guardadas en el
 * navegador solo llevan `variantId` y cantidad; el precio, el stock y los datos de la prenda se piden al servidor. Una variante que
 * el servidor no devuelve se trata como «no disponible» y no cuenta en los totales (CA-62). Una cantidad por encima del stock se
 * limita y se avisa (CA-05).
 *
 * Con sesión (`initialAccountCart` definido), el carrito vive en la cuenta (CA-63): los cambios se aplican al momento y se guardan
 * en el servidor en orden; al llegar, las líneas del navegador se fusionan con las de la cuenta (CA-04).
 */
export function useCart(initialAccountCart?: SavedCart): UseCart {
  const hydrated = useHydrated();
  const guestCart = useSavedCart();
  const isAccount = initialAccountCart !== undefined;
  const [accountCart, setAccountCart] = useState<SavedCart>(initialAccountCart ?? []);
  const saved = isAccount ? accountCart : guestCart;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notice, setNotice] = useState<CartNotice | null>(null);

  // Guardado en la cuenta: en serie y solo se aplica la respuesta de la última petición.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(0);
  const persist = useCallback((next: SavedCart, previous: SavedCart) => {
    setAccountCart(next);
    const ticket = ++latest.current;
    queue.current = queue.current.then(async () => {
      const result = await saveAccountCartAction(next).catch(() => ({ status: 'error' as const }));
      if (ticket !== latest.current) return;
      if (result.status === 'ok') setAccountCart(result.cart);
      else {
        setAccountCart(previous);
        setNotice({ variantId: null, text: 'No hemos podido guardar el cambio. Inténtalo de nuevo.' });
      }
    });
  }, []);

  useGuestCartMerge(isAccount, setAccountCart);

  const ids = saved.map((line) => line.variantId);
  // Solo se vuelve a preguntar al servidor si hay variantes que aún no se han pedido.
  const pendingKey = ids.filter((id) => !loaded?.requested.has(id)).join(',');
  const allKey = ids.join(',');

  useEffect(() => {
    if (pendingKey === '') return;
    const requestedIds = allKey.split(',');
    let cancelled = false;
    void getCartLinesAction(requestedIds).then((result) => {
      if (cancelled) return;
      setLoaded({
        requested: new Set(requestedIds),
        lines: new Map(result.status === 'ok' ? result.lines.map((line) => [line.variantId, line]) : []),
        failed: result.status === 'error',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pendingKey, allKey]);

  const lines: CartLineState[] = saved.map((line) => {
    const info = loaded?.lines.get(line.variantId) ?? null;
    if (info === null) return { saved: line, info, state: 'missing', qty: 0 };
    if (info.stock === 0) return { saved: line, info, state: 'soldOut', qty: 0 };
    return { saved: line, info, state: 'ok', qty: Math.min(line.qty, maxQty(info.stock)) };
  });
  const counted = lines.flatMap((line) => (line.state === 'ok' && line.info ? [{ ...line.info, qty: line.qty }] : []));
  const totals = summarize(counted);

  let status: CartStatus = 'ready';
  if (!hydrated) status = 'loading';
  else if (saved.length === 0) status = 'empty';
  else if (pendingKey !== '' && !loaded?.failed) status = 'loading';
  else if (loaded?.failed) status = 'failed';

  function apply(next: SavedCart) {
    if (isAccount) persist(next, saved);
    else writeCart(next);
  }

  function change(variantId: string, requested: number, info: CartLineInfo) {
    const result = setLineQty(saved, variantId, requested, info.stock);
    apply(result.cart);
    setNotice(
      result.capped
        ? {
            variantId,
            text: `Solo quedan ${info.stock} unidades de ${info.productName} en talla ${info.size}.`,
          }
        : null,
    );
  }

  function remove(variantId: string, name: string) {
    apply(removeLine(saved, variantId));
    setNotice({ variantId: null, text: `${name} se ha quitado del carrito.` });
  }

  return {
    hydrated,
    isAccount,
    saved,
    status,
    lines,
    totals,
    savingsCents: savingsCents(counted),
    notice,
    change,
    remove,
    retry: () => setLoaded(null),
  };
}
