'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import type { QuickAddSize } from '@/lib/catalog/quick-add';

/**
 * Panel de compra rápida de la tarjeta (CA-120, T-077, Enmiendas 32 y 33). Sube desde la parte baja de la imagen con las
 * tallas del primer color con stock (4 columnas; las agotadas, tachadas y desactivadas) y «Añadir a la cesta», desactivado
 * hasta elegir talla. Solo desde `--bp-md` (`hidden md:block`) y solo se ve con **hover real** (`group-hover`, limitado por
 * Tailwind a `@media (hover: hover)`) o con **foco dentro de la tarjeta** (`group-focus-within`); mientras no se ve no
 * recibe pulsaciones (`pointer-events-none`), así que en una tableta táctil un toque en la imagen va a la ficha. Va por
 * encima del enlace extendido de la tarjeta (`z-10`): pulsar fuera de sus botones sigue llevando a la ficha. Con Esc se
 * oculta hasta que el puntero o el foco salen de la tarjeta (WCAG 1.4.13) y el foco vuelve al enlace. Sin transición con
 * `prefers-reduced-motion`.
 */
export function QuickAdd({
  productName,
  sizes,
  moreColors,
  signedIn,
}: {
  readonly productName: string;
  readonly sizes: readonly QuickAddSize[];
  readonly moreColors: number;
  readonly signedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = sizes.find((size) => size.variantId === selectedId) ?? null;

  // Tras Esc, el panel vuelve a poder verse cuando el puntero o el foco salen de la tarjeta.
  useEffect(() => {
    const card = panelRef.current?.closest('article');
    if (!card) return;
    const reset = () => setDismissed(false);
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) reset();
    };
    card.addEventListener('mouseleave', reset);
    card.addEventListener('focusout', onFocusOut);
    return () => {
      card.removeEventListener('mouseleave', reset);
      card.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    setDismissed(true);
    panelRef.current?.closest('article')?.querySelector<HTMLElement>('a[href^="/producto/"]')?.focus();
  }

  return (
    <div
      ref={panelRef}
      data-testid="quick-add"
      data-dismissed={dismissed}
      onKeyDown={onKeyDown}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden bg-surface/95 p-4 opacity-0 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none md:block group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 data-[dismissed=true]:pointer-events-none! data-[dismissed=true]:opacity-0!"
    >
      <div role="group" aria-label={`Talla de ${productName}`} className="grid grid-cols-4 gap-2">
        {sizes.map((size) => {
          const soldOut = size.stock <= 0;
          const active = size.variantId === selectedId;
          return (
            <button
              key={size.variantId}
              type="button"
              disabled={soldOut}
              aria-pressed={active}
              aria-label={soldOut ? `Talla ${size.size}, agotada` : `Talla ${size.size}`}
              data-testid="quick-add-size"
              onClick={() => setSelectedId(size.variantId)}
              className={`min-h-11 rounded-control border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                active
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-border-strong bg-surface text-fg hover:bg-accent-soft'
              }`}
            >
              {size.size}
            </button>
          );
        })}
      </div>
      {moreColors > 0 ? (
        <p className="mt-2 text-xs text-fg-muted">
          +{moreColors} {moreColors === 1 ? 'color' : 'colores'} en la ficha
        </p>
      ) : null}
      <div className="mt-4">
        <AddToCartButton
          variantId={selected?.variantId ?? null}
          stock={selected?.stock ?? 0}
          productName={productName}
          signedIn={signedIn}
          testId="quick-add-button"
          hideHint
          fullWidth
          label="Añadir a la cesta"
        />
      </div>
    </div>
  );
}
