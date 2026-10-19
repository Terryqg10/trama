import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductActiveForm, VariantsSection } from '@/components/admin/VariantsSection';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminProduct } from '@/lib/admin/products';

export const metadata: Metadata = { title: 'Editar producto' };

export default async function AdminProductoPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await requireAdmin();

  const data = await getAdminProduct(client, id);
  if (!data) notFound();
  const { product, variants } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/productos"
        className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 text-sm font-medium text-accent-text hover:underline md:min-h-(--control-height)"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a productos
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-display font-semibold">{product.name}</h1>
        <span
          data-testid="product-state"
          className={`inline-flex min-h-6 items-center rounded-tile border bg-surface px-2 text-xs font-medium ${product.active ? 'border-success text-success' : 'border-border-strong text-fg-muted'}`}
        >
          {product.active ? 'Activo' : 'Inactivo'}
        </span>
        {product.active ? (
          <Link
            href={`/producto/${product.slug}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-control text-sm font-medium text-accent-text hover:underline md:min-h-(--control-height)"
          >
            Ver en la tienda
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <section aria-labelledby="titulo-datos" className="rounded-container border border-border bg-surface p-4">
        <h2 id="titulo-datos" className="mb-3 text-lg font-semibold">
          Datos del producto
        </h2>
        <ProductForm product={product} />
      </section>

      <VariantsSection productId={product.id} variants={variants} />

      <section aria-labelledby="titulo-baja" className="rounded-container border border-border bg-surface p-4">
        <h2 id="titulo-baja" className="text-lg font-semibold">
          {product.active ? 'Dar de baja' : 'Producto inactivo'}
        </h2>
        <p className="mb-3 mt-1 text-sm text-fg-muted">
          {product.active
            ? 'Desactivar el producto lo oculta del catálogo, del carrito y del checkout. Conserva sus pedidos y se puede reactivar.'
            : 'Este producto no se ve en la tienda. Reactívalo para que vuelva al catálogo.'}
        </p>
        <ProductActiveForm productId={product.id} active={product.active} />
      </section>
    </div>
  );
}
