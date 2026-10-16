import Link from 'next/link';

/**
 * Logo de Trama: símbolo de trama (cuadrícula tejida) y wordmark.
 * Usa currentColor: hereda el color del contenedor, sin valores fijos.
 */
export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Trama, ir al inicio"
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
