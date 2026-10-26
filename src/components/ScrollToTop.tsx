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
 * botón. Oculto no existe en el DOM, así que no recibe foco. En las fichas de producto, en móvil, se sube para no tapar la
 * barra fija de «Añadir al carrito».
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

  const raised = pathname.startsWith('/producto/') ? 'bottom-24 md:bottom-6' : 'bottom-6';

  return (
    <button
      type="button"
      data-testid="scroll-to-top"
      aria-label="Volver arriba"
      onClick={goTop}
      className={`fixed right-4 z-40 inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-surface text-fg shadow-card hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-6 ${raised}`}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
  );
}
