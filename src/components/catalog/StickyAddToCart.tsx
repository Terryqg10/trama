'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { FavoriteButton } from './FavoriteButton';

/** «Volver arriba» aparece al bajar más de esta cantidad de pantallas (CA-74). */
const BACK_TO_TOP_SCREENS = 1.5;

/**
 * Barra fija inferior con el CTA de la ficha, solo en móvil (CA-72, patrón «barra inferior fija con el CTA»
 * de v1). Aparece cuando el botón original (`targetId`) sale de pantalla y se oculta cuando vuelve a verse,
 * con un desvanecimiento (CA-73). Oculta es `inert` y `aria-hidden`: no recibe foco ni la leen los lectores de
 * pantalla. La transición solo se aplica con `motion-safe`; con `prefers-reduced-motion` cambia sin animación.
 * Sobre la barra flota «Volver arriba» (CA-74), que aparece tras mucho scroll.
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
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  useEffect(() => {
    const update = () => setShowBackToTop(window.scrollY > window.innerHeight * BACK_TO_TOP_SCREENS);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  function backToTop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // El foco pasa al primer enlace de la ficha: el botón se oculta (inert) al llegar arriba.
    document.querySelector<HTMLElement>('main a')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <div
      data-testid="sticky-add-to-cart"
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-4 shadow-card md:hidden motion-safe:transition-opacity motion-safe:duration-300 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        type="button"
        data-testid="back-to-top"
        aria-label="Volver arriba"
        aria-hidden={!showBackToTop}
        inert={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        onClick={backToTop}
        className={`absolute -top-14 right-4 inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface text-fg shadow-card hover:bg-surface-muted motion-safe:transition-opacity motion-safe:duration-300 ${
          showBackToTop ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          <p className="text-base font-bold text-fg">{priceLabel}</p>
        </div>
        <FavoriteButton testId="favorite-button-sticky" />
        {/* Ancho fijo: el aviso de «añadido» no debe ensanchar la columna ni truncar el nombre. */}
        <div className="w-40 shrink-0">
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
