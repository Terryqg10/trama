'use client';

import Link from 'next/link';
import { PageContainer } from '../PageContainer';

/** Estado de error del listado (spec, sección 6): mensaje y botón de reintento. */
export function CatalogError({ reset }: { readonly reset: () => void }) {
  return (
    <PageContainer>
      <div role="alert" className="rounded-container border border-danger bg-surface p-8 text-center">
        <p className="text-lg font-semibold text-danger">No hemos podido cargar los productos</p>
        <p className="mx-auto mt-2 max-w-(--layout-prose-max) text-fg-muted">
          Ha ocurrido un problema al consultar el catálogo. Inténtalo de nuevo.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface px-6 text-sm font-semibold text-fg hover:bg-accent-soft"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
