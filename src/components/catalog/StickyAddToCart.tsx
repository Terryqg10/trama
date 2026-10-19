'use client';

import { useEffect, useState } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';

/**
 * Barra fija inferior con el CTA de la ficha, solo en móvil (CA-72, patrón «barra inferior fija con el CTA»
 * de v1). Aparece cuando el botón original (`targetId`) sale de pantalla y se oculta cuando vuelve a verse.
 * Oculta es `inert` y `aria-hidden`: no recibe foco ni la leen los lectores de pantalla. La transición solo
 * se aplica con `motion-safe`; con `prefers-reduced-motion` aparece y desaparece sin animación.
 */
export function StickyAddToCart({
  targetId,
  name,
  priceLabel,
  variantId,
  stock,
  signedIn,
}: {
  /** `id` del contenedor del botón original, que observa el `IntersectionObserver`. */
  readonly targetId: string;
  readonly name: string;
  readonly priceLabel: string;
  readonly variantId: string | null;
  readonly stock: number;
  readonly signedIn: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry !== undefined && !entry.isIntersecting),
      // Actúa un poco antes de que el botón salga por abajo.
      { rootMargin: '0px 0px -100px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      data-testid="sticky-add-to-cart"
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 shadow-card md:hidden motion-safe:transition motion-safe:duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          <p className="text-base font-bold text-fg">{priceLabel}</p>
        </div>
        {/* Ancho fijo: el aviso de «añadido» no debe ensanchar la columna ni truncar el nombre. */}
        <div className="w-44 shrink-0">
          <AddToCartButton
            testId="add-to-cart-sticky"
            variantId={variantId}
            stock={stock}
            productName={name}
            signedIn={signedIn}
            hideHint
          />
        </div>
      </div>
    </div>
  );
}
