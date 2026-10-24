import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { OffersBanner } from '@/components/offers/OffersBanner';
import { getCurrentUser } from '@/lib/auth/session';
import { maxOfferPercent } from '@/lib/catalog/discount';
import { getOfferProducts } from '@/lib/catalog/queries';

export const metadata: Metadata = { title: 'Ofertas' };

/**
 * Prendas con precio rebajado (RF-11, RF-12, CA-02 a CA-04, T-100). Las ofertas salen de `compare_at_cents` (T-099);
 * la tarjeta es la completa del catálogo. Los errores de datos se propagan a `error.tsx`.
 */
export default async function OfertasPage() {
  const [products, { user }] = await Promise.all([getOfferProducts(), getCurrentUser()]);

  return (
    <PageContainer>
      <h1 className="text-display font-bold">Ofertas</h1>
      <div className="mt-6">
        <OffersBanner maxPercent={maxOfferPercent(products)} />
      </div>

      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Ahora mismo no hay ofertas"
            description="Cuando haya prendas rebajadas aparecerán aquí."
            action={{ href: '/novedades', label: 'Ver novedades' }}
          />
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mt-8 text-sm text-fg-muted">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index === 0} quickAdd={{ signedIn: user !== null }} />
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}
