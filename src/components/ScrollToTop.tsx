'use client';

import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Desplazamiento a partir del cual aparece el botón (CA-149). */
export const SCROLL_TOP_THRESHOLD = 400;

/**
 * Botón «Volver arriba» (CA-149, T-118): aparece al bajar más de 400 px y lleva al inicio de la página (instantáneo con
 * `prefers-reduced-motion`). Deja el foco en el logo para que quien navega con teclado no lo pierda al desaparecer el
 * botón. Oculto no existe en el DOM, así que no recibe foco. En las fichas de producto, en móvil, no se muestra: la barra
 * fija de «Añadir al carrito» ya lleva su propio «Volver arriba» (CA-74).
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SCROLL_TOP_THRESHOLD);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  function goTop(): void {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.querySelector<HTMLElement>('header a[href="/"]')?.focus({ preventScroll: true });
  }

  // En las fichas, en móvil, la barra fija ya lleva su propio «Volver arriba» (CA-74): aquí solo se muestra desde `--bp-md`,
  // donde esa barra no existe (Enmienda 52).
  const display = pathname.startsWith('/producto/') ? 'hidden md:inline-flex' : 'inline-flex';

  return (
    <button
      type="button"
      data-testid="scroll-to-top"
      aria-label="Volver arriba"
      onClick={goTop}
      className={`fixed bottom-6 right-4 z-40 size-11 items-center justify-center rounded-full border border-border-strong bg-surface text-fg shadow-card hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-6 ${display}`}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
  );
}
