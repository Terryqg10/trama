import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Package, Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { listAdminProducts, MAX_ADMIN_PRODUCTS, type AdminProductSummary } from '@/lib/admin/products';
import { capitalize } from '@/lib/catalog/facets';
import { formatEuros } from '@/lib/domain/shop';

export const metadata: Metadata = { title: 'Productos' };

const filterLink =
  'inline-flex min-h-11 items-center rounded-control border px-3 text-sm font-medium md:min-h-(--control-height)';

function matches(product: AdminProductSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return product.name.toLowerCase().includes(needle) || product.slug.includes(needle);
}

export default async function AdminProductosPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { estado, q } = await searchParams;
  const { client } = await requireAdmin();
  const query = typeof q === 'string' ? q.slice(0, 80) : '';
  const state = estado === 'activos' || estado === 'inactivos' ? estado : undefined;

  let products: AdminProductSummary[] = [];
  let failed = false;
  try {
    products = await listAdminProducts(client);
  } catch (error) {
    console.error('AdminProductosPage: no se pudo cargar el listado', error instanceof Error ? error.message : 'error');
    failed = true;
  }
  const visible = products.filter(
    (product) =>
      matches(product, query) && (state === undefined || (state === 'activos' ? product.active : !product.active)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-display font-semibold">Productos</h1>
          <p className="tabular text-sm text-fg-muted">
            {visible.length} {visible.length === 1 ? 'producto' : 'productos'}
            {products.length >= MAX_ADMIN_PRODUCTS ? ` (se muestran los últimos ${MAX_ADMIN_PRODUCTS})` : ''}
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover md:min-h-(--control-height)"
        >
          <Plus aria-hidden="true" className="size-4" />
          Nuevo producto
        </Link>
      </div>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {([
          [undefined, 'Todos'],
          ['activos', 'Activos'],
          ['inactivos', 'Inactivos'],
        ] as const).map(([value, label]) => (
          <Link
            key={label}
            href={{ pathname: '/admin/productos', query: { ...(value ? { estado: value } : {}), ...(query ? { q: query } : {}) } }}
            aria-current={state === value ? 'true' : undefined}
            className={`${filterLink} ${state === value ? 'border-accent bg-accent-soft text-accent-text' : 'border-border-strong bg-surface text-fg hover:bg-accent-soft'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form action="/admin/productos" role="search" className="max-w-md">
        <label htmlFor="buscar-producto" className="sr-only">
          Buscar productos por nombre o URL
        </label>
        <input
          id="buscar-producto"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={query}
          placeholder="Buscar producto"
          className="block w-full min-h-11 rounded-control border border-border-strong bg-surface px-3 text-sm md:min-h-(--control-height)"
        />
        {state ? <input type="hidden" name="estado" value={state} /> : null}
      </form>

      {failed ? (
        <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
          No hemos podido cargar los productos. Recarga la página para reintentarlo.
        </p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-container border border-border bg-surface px-6 py-12 text-center">
          <Package aria-hidden="true" className="size-6 text-fg-muted" />
          <p className="font-medium">{query || state ? 'Ningún producto coincide con el filtro' : 'Sin productos'}</p>
          <p className="text-sm text-fg-muted">
            {query || state ? 'Prueba con otro filtro o quita la búsqueda.' : 'Crea el primero para que aparezca en la tienda.'}
          </p>
          {!query && !state ? (
            <Link
              href="/admin/productos/nuevo"
              className="mt-2 inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover md:min-h-(--control-height)"
            >
              Crear producto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-clip rounded-container border border-border bg-surface">
          <div
            role="presentation"
            aria-hidden="true"
            data-testid="admin-table-header"
            className="sticky top-(--topbar-height) z-10 hidden grid-cols-12 gap-(--grid-gap) border-b border-border bg-surface-muted px-4 py-2 text-xs font-medium tracking-tight text-fg-muted md:grid"
          >
            <span className="col-span-4">Producto</span>
            <span className="col-span-2">Categoría</span>
            <span className="col-span-2 text-right">Desde</span>
            <span className="col-span-1 text-right">Stock</span>
            <span className="col-span-1 text-right">Variantes</span>
            <span className="col-span-2">Estado</span>
          </div>
          <ul className="divide-y divide-border">
            {visible.map((product) => (
              <li
                key={product.id}
                data-testid="admin-product-row"
                className="relative grid min-h-(--row-height) grid-cols-2 items-center gap-x-(--grid-gap) gap-y-1 px-4 py-3 text-sm hover:bg-accent-soft md:grid-cols-12 md:py-2"
              >
                <span className="col-span-2 flex items-center justify-between md:col-span-4">
                  <Link href={`/admin/productos/${product.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                    {product.name}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-4 text-fg-muted md:hidden" />
                </span>
                <span className="md:col-span-2">
                  {capitalize(product.category)} · {capitalize(product.gender)}
                </span>
                <span className="tabular text-right md:col-span-2">
                  <span className="mr-2 text-fg-muted md:hidden">Desde</span>
                  {product.fromPriceCents === null ? '—' : formatEuros(product.fromPriceCents)}
                </span>
                <span className="tabular md:col-span-1 md:text-right">
                  <span className="text-fg-muted md:hidden">Stock: </span>
                  {product.totalStock}
                </span>
                <span className="tabular text-right md:col-span-1">
                  <span className="mr-2 text-fg-muted md:hidden">Variantes</span>
                  {product.variantCount}
                </span>
                <span className="col-span-2 md:col-span-2">
                  <span
                    data-testid="product-state"
                    className={`inline-flex min-h-6 items-center rounded-tile border bg-surface px-2 text-xs font-medium ${product.active ? 'border-success text-success' : 'border-border-strong text-fg-muted'}`}
                  >
                    {product.active ? 'Activo' : 'Inactivo'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
