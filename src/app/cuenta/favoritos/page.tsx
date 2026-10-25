import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { requireUser } from '@/lib/auth/session';
import { getProductsByIds } from '@/lib/catalog/queries';
import type { CatalogProduct } from '@/lib/catalog/product';
import { removeFavoriteFormAction } from '@/lib/favorites/actions';
import { listFavoriteProductIds } from '@/lib/favorites/favorites';

export const metadata: Metadata = { title: 'Mis favoritos' };

/** Tope de la lista (T-043): sin paginación. */
const MAX_FAVORITES = 100;

const secondaryButton =
  'inline-flex min-h-11 w-full items-center justify-center rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-accent-soft';

/**
 * Favoritos del cliente (RF-24, CA-78, T-043). Componente de servidor protegido como el resto de `/cuenta`: lista sus
 * productos activos (los desactivados no aparecen) con la tarjeta del catálogo y la opción de quitarlos. Sin favoritos,
 * un aviso con enlace al catálogo; si falla la carga, un mensaje.
 */
export default async function FavoritosPage() {
  const { client } = await requireUser();

  let products: CatalogProduct[] = [];
  let failed = false;
  try {
    const ids = (await listFavoriteProductIds(client)).slice(0, MAX_FAVORITES);
    products = await getProductsByIds(ids);
  } catch (error) {
    console.error('FavoritosPage: no se pudieron cargar los favoritos', error instanceof Error ? error.message : 'error');
    failed = true;
  }

  return (
    <PageContainer>
      <Link
        href="/cuenta"
        className="inline-flex min-h-11 items-center rounded-control pr-3 text-sm font-medium text-accent-text hover:underline"
      >
        Volver a mi cuenta
      </Link>
      <h1 className="mt-2 text-display font-bold">Mis favoritos</h1>

      <div className="mt-8">
        {failed ? (
          <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
            No hemos podido cargar tus favoritos. Recarga la página para reintentarlo.
          </p>
        ) : products.length === 0 ? (
          <EmptyState
            title="Aún no tienes favoritos"
            description="Pulsa el corazón de una prenda para guardarla aquí."
            action={{ href: '/novedades', label: 'Ver novedades' }}
          />
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </p>
            <ul data-testid="favorites-list" className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, index) => (
                <li key={product.id} className="flex flex-col gap-3">
                  <div className="flex-1">
                    <ProductCard product={product} priority={index === 0} />
                  </div>
                  <form action={removeFavoriteFormAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" aria-label={`Quitar ${product.name} de favoritos`} className={secondaryButton}>
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </PageContainer>
  );
}
