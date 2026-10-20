import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { searchProducts } from '@/lib/catalog/queries';
import { parseSearchQuery } from '@/lib/catalog/search';

export const metadata: Metadata = { title: 'Buscar', robots: { index: false } };

/**
 * Resultados de la búsqueda por nombre (RF-25, CA-93, T-052). Componente de servidor: normaliza el texto, consulta y
 * pinta. Los errores de datos se propagan a `error.tsx`.
 */
export default async function BuscarPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseSearchQuery((await searchParams).q);
  const products = await searchProducts(query);

  return (
    <PageContainer>
      <h1 className="text-display font-bold">{query === '' ? 'Buscar' : `Resultados para «${query}»`}</h1>

      {query === '' ? (
        <div className="mt-6">
          <EmptyState
            title="Escribe lo que buscas"
            description="Usa el buscador de la cabecera para encontrar un producto por su nombre."
            action={{ href: '/novedades', label: 'Ver novedades' }}
          />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No hay productos para «${query}»`}
            description="Revisa la ortografía o prueba con una palabra más corta, como «camiseta» o «abrigo»."
            action={{ href: '/novedades', label: 'Ver novedades' }}
          />
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mt-6 text-sm text-fg-muted">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} priority={index === 0} />
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}
