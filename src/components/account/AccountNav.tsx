'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/auth/actions';

/**
 * Navegación de la cuenta (RF-02, CA-07, T-102). Desde 768 px, columna lateral; por debajo, pestañas horizontales
 * desplazables (DP-2 A: el `overflow-x-auto` es deliberado y la excepción de `responsive.spec.ts`). La activa lleva
 * `aria-current="page"` y un fondo de acento (no solo color: también negrita). «Cerrar sesión» es un formulario de servidor.
 * Trama Club y Recomienda y gana (T-103, T-104) son pantallas informativas «Próximamente».
 */
const ITEMS = [
  { href: '/cuenta', label: 'Mis datos', also: ['/cuenta/direcciones'] },
  { href: '/cuenta/pedidos', label: 'Mis pedidos', also: [] },
  { href: '/cuenta/favoritos', label: 'Mis favoritos', also: [] },
  { href: '/cuenta/club', label: 'Trama Club', also: [] },
  { href: '/cuenta/recomienda', label: 'Recomienda y gana', also: [] },
] as const;

function isActive(pathname: string, href: string, also: readonly string[]): boolean {
  return [href, ...also].some((base) => pathname === base || (base !== '/cuenta' && pathname.startsWith(`${base}/`)));
}

const itemClass =
  'inline-flex min-h-11 w-full items-center whitespace-nowrap rounded-control px-4 text-sm font-medium text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mi cuenta" data-testid="account-nav">
      <ul
        data-allow-overflow
        className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:gap-1 md:overflow-visible md:pb-0"
      >
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.also);
          return (
            <li key={item.href} className="shrink-0 md:shrink">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`${itemClass}${active ? ' bg-accent-soft font-bold text-accent-text' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 md:shrink">
          <form action={logoutAction}>
            <button type="submit" className={`${itemClass} text-start`}>
              Cerrar sesión
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
