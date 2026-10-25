import type { ReactNode } from 'react';
import { AccountNav } from '@/components/account/AccountNav';
import { requireUser } from '@/lib/auth/session';

/**
 * Diseño común de `/cuenta/*` (RF-02, CA-07, T-102): barra lateral desde 768 px y pestañas desplazables por debajo. Sin
 * sesión redirige al acceso, como cada página. El contenedor de página vive aquí: las páginas ya no lo repiten.
 */
export default async function CuentaLayout({ children }: { readonly children: ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto max-w-(--layout-container) px-(--layout-gutter) py-10 md:grid md:grid-cols-4 md:items-start md:gap-10">
      <div className="md:col-span-1">
        <AccountNav />
      </div>
      <div className="mt-6 min-w-0 md:col-span-3 md:mt-0">{children}</div>
    </div>
  );
}
