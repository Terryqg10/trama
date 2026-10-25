'use client';

import Link from 'next/link';
import { useState } from 'react';
import { addToAccountCartAction } from '@/lib/cart/actions';
import { addToCart } from '@/lib/cart/cart';
import { announceAccountCart } from '@/lib/cart/count';
import { readCart, useHydrated, writeCart } from '@/lib/cart/store';
import { useGuestCartMerge } from '@/lib/cart/use-guest-merge';
import { useCartDrawer } from './CartDrawerContext';

/**
 * Botón «Añadir al carrito» de la ficha (RF-03, CA-60); al añadir con éxito abre el carrito lateral (CA-124, T-085). Sin variante elegida (falta la talla) queda
 * deshabilitado y lo explica. El aviso de resultado va en una región `aria-live`, no solo en color.
 * Necesita JavaScript. Sin sesión el carrito vive en el navegador; con sesión (`signedIn`) se guarda
 * en la cuenta (T-031) y las líneas que hubiera en el navegador se fusionan al llegar (CA-04).
 */
export function AddToCartButton({
  variantId,
  stock,
  productName,
  signedIn,
  testId = 'add-to-cart',
  hideHint = false,
  fullWidth = false,
  label = 'Añadir al carrito',
}: {
  readonly variantId: string | null;
  readonly stock: number;
  readonly productName: string;
  readonly signedIn: boolean;
  /** `data-testid` del botón. La barra fija de la ficha (T-039) usa otro para no duplicar el del original. */
  readonly testId?: string;
  /** No repite «Elige una talla…»: la barra fija de la ficha (T-039) convive con el botón original, que ya lo dice. */
  readonly hideHint?: boolean;
  /** Ocupa todo el ancho también desde `sm` (el panel de compra rápida de la tarjeta, T-077). */
  readonly fullWidth?: boolean;
  /** Texto del botón. */
  readonly label?: string;
}) {
  const hydrated = useHydrated();
  const { openCart } = useCartDrawer();
  const [busy, setBusy] = useState(false);
  useGuestCartMerge(signedIn);
  const [notice, setNotice] = useState<{ readonly text: string; readonly added: boolean } | null>(null);
  const disabled = !hydrated || variantId === null || busy;

  async function add() {
    if (variantId === null) return;
    let capped: boolean;
    if (signedIn) {
      setBusy(true);
      const result = await addToAccountCartAction(variantId).catch(() => ({ status: 'error' as const }));
      setBusy(false);
      if (result.status !== 'ok') {
        setNotice({
          text:
            result.status === 'unavailable'
              ? 'Esta prenda ya no está disponible.'
              : 'No hemos podido añadirla al carrito. Inténtalo de nuevo.',
          added: false,
        });
        return;
      }
      announceAccountCart(result.cart);
      capped = result.capped;
    } else {
      const result = addToCart(readCart(), variantId, stock);
      writeCart(result.cart);
      capped = result.capped;
    }
    if (capped) {
      setNotice({
        text:
          stock > 0
            ? `Ya tienes en el carrito todas las unidades disponibles (${stock}).`
            : 'Esta prenda está agotada.',
        added: false,
      });
      return;
    }
    setNotice({ text: `${productName} añadido al carrito.`, added: true });
    // Se añadió algo: se abre el carrito lateral (CA-124, T-085).
    openCart();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void add()}
        disabled={disabled}
        data-testid={testId}
        className={`inline-flex min-h-12 w-full items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted${fullWidth ? '' : ' sm:w-auto'}`}
      >
        {label}
      </button>
      {variantId === null && !hideHint ? <p className="text-sm text-fg-muted">Elige una talla para añadirla al carrito.</p> : null}
      <div aria-live="polite" className="text-sm font-medium text-fg">
        {notice ? (
          <p>
            {notice.text}{' '}
            {notice.added ? (
              <Link href="/carrito" className="text-accent-text underline underline-offset-4 hover:text-accent-hover">
                Ver carrito
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
