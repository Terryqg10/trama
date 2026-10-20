'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Logo de Trama: símbolo de trama (cuadrícula tejida) y wordmark.
 * Usa currentColor: hereda el color del contenedor, sin valores fijos.
 *
 * Siempre enlaza a `/`. Si ya se está en `/` (sin parámetros ni hash), Next no sube la página al «navegar» a la ruta
 * actual —con la cabecera fija no se nota nada—, así que se sube a mano (CA-109, T-065): suave, o de golpe con
 * `prefers-reduced-motion`.
 */
export function Logo() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  function onClick(event: MouseEvent<HTMLAnchorElement>): void {
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    const here = pathname === '/' && window.location.search === '' && window.location.hash === '';
    if (!plain || !here) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <Link
      href="/"
      aria-label="Trama, ir al inicio"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-control text-accent-text"
    >
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 8h16M4 16h16M8 4v16M16 4v16" />
      </svg>
      <span className="text-xl font-bold tracking-tight">Trama</span>
    </Link>
  );
}
