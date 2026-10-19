import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductForm } from '@/components/admin/ProductForm';
import { requireAdmin } from '@/lib/auth/admin';

export const metadata: Metadata = { title: 'Nuevo producto' };

export default async function AdminNuevoProductoPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <Link
        href="/admin/productos"
        className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 text-sm font-medium text-accent-text hover:underline md:min-h-(--control-height)"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a productos
      </Link>
      <h1 className="text-display font-semibold">Nuevo producto</h1>
      <p className="text-sm text-fg-muted">
        Al crearlo podrás añadir sus variantes (talla, color, precio y stock). Hasta entonces no se podrá comprar.
      </p>
      <div className="rounded-container border border-border bg-surface p-4">
        <ProductForm />
      </div>
    </div>
  );
}
