'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TopBar } from './layout/TopBar';

/**
 * Marco de la tienda: barra de anuncios (T-046), cabecera, `main` y pie. Las rutas de `/admin` usan su propio marco (sidebar y topbar
 * del estilo v4, ADR-008) y no muestran ni la cabecera ni el pie de la tienda; el panel aporta su `main`.
 * Cabecera y pie llegan como elementos ya creados desde el layout raíz.
 */
export function ShopFrame({
  header,
  footer,
  children,
}: {
  readonly header: ReactNode;
  readonly footer: ReactNode;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return <>{children}</>;
  return (
    <>
      <TopBar />
      {header}
      <main id="contenido" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
