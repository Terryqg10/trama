'use client';

import Link from 'next/link';
import { useState } from 'react';
import { addToCart } from '@/lib/cart/cart';
import { readCart, useHydrated, writeCart } from '@/lib/cart/store';

/**
 * Botón «Añadir al carrito» de la ficha (RF-03, CA-60). Sin variante elegida (falta la talla) queda
 * deshabilitado y lo explica. El aviso de resultado va en una región `aria-live`, no solo en color.
 * Necesita JavaScript: el carrito vive en el navegador.
 */
export function AddToCartButton({
  variantId,
  stock,
  productName,
}: {
  readonly variantId: string | null;
  readonly stock: number;
  readonly productName: string;
}) {
  const hydrated = useHydrated();
  const [notice, setNotice] = useState<{ readonly text: string; readonly added: boolean } | null>(null);
  const disabled = !hydrated || variantId === null;

  function add() {
    if (variantId === null) return;
    const result = addToCart(readCart(), variantId, stock);
    writeCart(result.cart);
    if (result.capped) {
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
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        data-testid="add-to-cart"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted sm:w-auto"
      >
        Añadir al carrito
      </button>
      {variantId === null ? <p className="text-sm text-fg-muted">Elige una talla para añadirla al carrito.</p> : null}
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
