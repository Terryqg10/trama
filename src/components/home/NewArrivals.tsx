import { listProducts } from '@/lib/catalog/queries';
import type { CatalogProduct } from '@/lib/catalog/product';
import { NovedadesCarousel } from './NovedadesCarousel';

/** Máximo de novedades en la portada (CA-85, T-048). */
export const NEW_ARRIVALS_LIMIT = 8;

/**
 * Carrusel de novedades de la portada. Si la consulta falla o no hay productos marcados como novedad, la sección no
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
  return <NovedadesCarousel products={products} />;
}
