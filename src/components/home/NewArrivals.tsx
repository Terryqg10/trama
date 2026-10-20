import Link from 'next/link';
import { listProducts } from '@/lib/catalog/queries';
import type { CatalogProduct } from '@/lib/catalog/product';
import { ProductCard } from '../catalog/ProductCard';

/** Máximo de novedades en la portada (CA-85, T-048). */
export const NEW_ARRIVALS_LIMIT = 8;

/**
 * Rejilla de novedades de la portada. Si la consulta falla o no hay productos marcados como novedad, la sección no
 * se muestra: la portada no se rompe.
 */
export async function NewArrivals() {
  let products: CatalogProduct[] = [];
  try {
    products = (await listProducts({ onlyNew: true, sort: 'novedades' })).slice(0, NEW_ARRIVALS_LIMIT);
  } catch (error) {
    console.error('NewArrivals: no se pudieron cargar las novedades', error instanceof Error ? error.message : 'error desconocido');
  }
  return <NewArrivalsView products={products} />;
}

export function NewArrivalsView({ products }: { readonly products: readonly CatalogProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="novedades-titulo" data-testid="new-arrivals">
      <div className="flex items-end justify-between gap-4">
        <h2 id="novedades-titulo" className="text-2xl font-bold text-fg">
          Novedades
        </h2>
        <Link
          href="/novedades"
          className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-accent-text hover:underline"
        >
          Ver todo
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
