'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';

/** Desplazamiento inicial de la entrada, en px (CA-90). */
export const REVEAL_OFFSET_PX = 20;

/**
 * Envuelve una sección de la portada y la hace aparecer con un fundido y una subida de 20 px la primera vez que
 * entra en el viewport (CA-90, T-051). Solo anima `opacity` y `transform`, que no provocan reflujo.
 *
 * Con `prefers-reduced-motion` la sección se muestra de golpe, sin desplazamiento ni fundido. Es siempre el mismo
 * elemento (no se cambia por un `div` al hidratar): así no se pierde el foco ni se recrea lo que hay dentro. Sin
 * JavaScript, `globals.css` anula el estado inicial oculto (`@media (scripting: none)`) para que el contenido nunca
 * se pierda.
 */
export function AnimatedSection({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  const reduced = usePrefersReducedMotion();
  const visible = { opacity: 1, y: 0 };

  return (
    <motion.div
      data-reveal={reduced ? undefined : ''}
      className={className}
      initial={{ opacity: 0, y: REVEAL_OFFSET_PX }}
      {...(reduced
        ? { animate: visible, transition: { duration: 0 } }
        : { whileInView: visible, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.5, ease: 'easeOut' as const } })}
    >
      {children}
    </motion.div>
  );
}
