import type { Route } from 'next';

export interface NavItem {
  readonly label: string;
  readonly href: Route;
}

/** Navegación principal (RF-13). Fuente única para cabecera, tests y e2e. */
export const MAIN_NAV: readonly NavItem[] = [
  { label: 'Hombre', href: '/hombre' },
  { label: 'Mujer', href: '/mujer' },
  { label: 'Novedades', href: '/novedades' },
  { label: 'Ofertas', href: '/ofertas' },
];

/** Enlaces legales del pie (RF-12, CA-34). Páginas de ejemplo, sin valor jurídico. */
export const LEGAL_NAV: readonly NavItem[] = [
  { label: 'Aviso legal', href: '/aviso-legal' },
  { label: 'Privacidad', href: '/privacidad' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Condiciones', href: '/condiciones' },
];

/** Acciones con icono (se renderizan con aria-label). */
export const ACTION_NAV = {
  cart: { label: 'Carrito', href: '/carrito' },
  account: { label: 'Cuenta', href: '/cuenta' },
} as const satisfies Record<string, NavItem>;
