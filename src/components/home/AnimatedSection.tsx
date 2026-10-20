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
 * Con `prefers-reduced-motion` no se envuelve en nada animado: la sección se ve desde el principio. Sin JavaScript,
 * `globals.css` anula el estado inicial oculto (`@media (scripting: none)`) para que el contenido nunca se pierda.
 */
export function AnimatedSection({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: REVEAL_OFFSET_PX }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
