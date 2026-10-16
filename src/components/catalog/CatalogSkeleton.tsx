import { PageContainer } from '../PageContainer';

/** Esqueleto de carga del listado. La animación solo si el usuario no pidió reducir el movimiento. */
export function CatalogSkeleton() {
  return (
    <PageContainer>
      <div role="status" aria-live="polite">
        <span className="sr-only">Cargando productos…</span>
        <div aria-hidden="true">
          <div className="h-12 w-48 rounded-control bg-surface-muted motion-safe:animate-pulse" />
          <div className="mt-6 h-11 rounded-container bg-surface-muted motion-safe:animate-pulse" />
          <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="overflow-hidden rounded-card border border-border bg-surface">
                <div className="aspect-4/5 bg-surface-muted motion-safe:animate-pulse" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded-control bg-surface-muted" />
                  <div className="h-4 w-1/3 rounded-control bg-surface-muted" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
