import Link from 'next/link';
import type { Route } from 'next';
import { deriveFacets } from '@/lib/catalog/facets';
import {
  parseCatalogParams,
  type CatalogFilters as Filters,
  type Gender,
  type RawSearchParams,
} from '@/lib/catalog/filters';
import { listProducts } from '@/lib/catalog/queries';
import { PageContainer } from '../PageContainer';
import { FiltersMobile, FiltersSidebar } from './CatalogFilters';
import { ProductCard } from './ProductCard';

export interface CatalogScope {
  /** Género fijado por la ruta (/hombre, /mujer). Prevalece sobre el parámetro. */
  readonly gender?: Gender;
  /** Solo productos nuevos (/novedades). */
  readonly onlyNew?: boolean;
}

const linkButton =
  'inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover';

/**
 * Listado de catálogo (RF-01, RF-13, RF-14, RF-19). Componente de servidor: valida
 * los parámetros, consulta los datos y pinta el listado. Los errores de datos se
 * propagan a `error.tsx`; los parámetros inválidos se ignoran (SPEC-002 RF-09).
 */
export async function CatalogView({
  title,
  basePath,
  scope,
  searchParams,
}: {
  readonly title: string;
  readonly basePath: Route;
  readonly scope: CatalogScope;
  readonly searchParams: Promise<RawSearchParams>;
}) {
  const parsed = parseCatalogParams(await searchParams);

  // La ruta manda: el género de /hombre o /mujer y "solo novedades" de /novedades.
  const filters: Filters = {
    ...parsed,
    onlyNew: Boolean(scope.onlyNew) || parsed.onlyNew,
  };
  if (scope.gender) filters.gender = scope.gender;

  const scopeBase: Filters = { onlyNew: Boolean(scope.onlyNew), sort: 'novedades' };
  if (scope.gender) scopeBase.gender = scope.gender;

  const facets = deriveFacets(await listProducts(scopeBase));

  // Talla o color que no existen en este ámbito (p. ej. talla=XXXL) se ignoran (CA-09).
  if (filters.size && !facets.sizes.includes(filters.size)) delete filters.size;
  if (filters.color && !facets.colors.includes(filters.color)) delete filters.color;

  const products = await listProducts(filters);

  const filterProps = { basePath, facets, filters, showGender: scope.gender === undefined };

  return (
    <PageContainer>
      <h1 className="text-display font-bold">{title}</h1>

      <div className="mt-6 lg:flex lg:items-start lg:gap-8">
        <FiltersSidebar {...filterProps} />

        <div className="min-w-0 lg:flex-1">
          <FiltersMobile {...filterProps} />

          <p aria-live="polite" className="mt-6 text-sm text-fg-muted lg:mt-0">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>

          {products.length === 0 ? (
            <div className="mt-4 rounded-container border border-border bg-surface p-8 text-center">
              <p className="text-lg font-semibold text-fg">No hay productos con estos filtros</p>
              <p className="mx-auto mt-2 max-w-(--layout-prose-max) text-fg-muted">
                Prueba con otras opciones o quita los filtros para ver todo el catálogo.
              </p>
              <Link href={basePath} className={`mt-6 ${linkButton}`}>
                Limpiar filtros
              </Link>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
