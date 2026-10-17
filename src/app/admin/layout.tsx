import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/auth/admin';
import './admin-theme.css';

export const metadata: Metadata = {
  title: { default: 'Administración', template: '%s · Administración' },
  robots: { index: false, follow: false },
};

/**
 * Layout del panel (estilo v4, ADR-008). El acceso se comprueba aquí para todas las páginas del panel: sin
 * sesión lleva al acceso y sin rol admin a la portada. Es una comodidad; la defensa real son las políticas RLS.
 */
export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
