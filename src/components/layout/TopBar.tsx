'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { useEffect, useState, type FocusEvent, type PointerEvent } from 'react';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/** Tiempo que se ve cada mensaje antes de pasar al siguiente (CA-110). */
export const ROTATE_MS = 4000;

/**
 * Barra de anuncios sobre la cabecera de la tienda (CA-94 y CA-110, T-053 y T-066). El umbral de envío gratis sale de
 * la constante de `shop.ts` (RF-22): nunca se escribe a mano, para que coincida con el carrito.
 *
 * Los dos mensajes se turnan: el actual sube y se desvanece y entra el siguiente desde abajo (solo `opacity` y
 * `transform`). Se detiene con el ratón encima, con el foco dentro y con el botón de pausa (WCAG 2.2.2). Con
 * `prefers-reduced-motion` no hay movimiento: se ven los dos a la vez (apilados en móvil, con separador desde `sm`).
 * Los lectores de pantalla tienen siempre los dos textos; el rótulo animado va oculto para ellos.
 */
export function TopBar() {
  const reduced = usePrefersReducedMotion();
  const messages = ['Nueva colección Otoño/Invierno ya disponible', `Envío gratis a partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}`];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const playing = !reduced && !paused && !hovered && !focused;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % 2), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') setHovered(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <div
      data-testid="top-bar"
      data-message-index={index}
      data-playing={playing}
      className="relative bg-accent text-xs font-medium text-accent-fg sm:text-sm"
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      {reduced ? (
        <p className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-4 py-2 text-center sm:flex-row sm:gap-3">
          <span>{messages[0]}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            |
          </span>
          <span>{messages[1]}</span>
        </p>
      ) : (
        <>
          <p className="sr-only">
            <span>{messages[0]}</span> <span>{messages[1]}</span>
          </p>
          <div aria-hidden="true" className="relative mx-auto h-11 max-w-(--layout-container) overflow-hidden px-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                data-testid="top-bar-message"
                className="absolute inset-0 flex items-center justify-center px-12 text-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {messages[index]}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            type="button"
            aria-label={paused ? 'Reanudar los mensajes de la barra' : 'Pausar los mensajes de la barra'}
            onClick={() => setPaused((value) => !value)}
            className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-control hover:bg-accent-fg/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-fg"
          >
            {/* Los dos iconos siempre en el DOM: si el nodo bajo el puntero desaparece, algunos navegadores no avisan de la salida. */}
            <Play aria-hidden="true" className={paused ? 'size-4' : 'hidden'} />
            <Pause aria-hidden="true" className={paused ? 'hidden' : 'size-4'} />
          </button>
        </>
      )}
    </div>
  );
}
