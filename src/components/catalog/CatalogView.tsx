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
import { CatalogFilters } from './CatalogFilters';
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
 * propagan a `error.tsx`; los parámetros inválidos se muestran, no se ignoran.
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

  if (!parsed.ok) {
    return (
      <PageContainer>
        <h1 className="text-display font-bold">{title}</h1>
        <div
          role="alert"
          className="mt-8 rounded-container border border-danger bg-surface p-6 text-fg"
        >
          <p className="font-semibold text-danger">Algunos filtros no son válidos</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
            {parsed.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <Link href={basePath} className={`mt-5 ${linkButton}`}>
            Quitar filtros
          </Link>
        </div>
      </PageContainer>
    );
  }

  // La ruta manda: el género de /hombre o /mujer y "solo novedades" de /novedades.
  const filters: Filters = {
    ...parsed.filters,
    onlyNew: Boolean(scope.onlyNew) || parsed.filters.onlyNew,
  };
  if (scope.gender) filters.gender = scope.gender;

  const scopeBase: Filters = { onlyNew: Boolean(scope.onlyNew), sort: 'novedades' };
  if (scope.gender) scopeBase.gender = scope.gender;

  const [scopeProducts, products] = await Promise.all([
    listProducts(scopeBase),
    listProducts(filters),
  ]);
  const facets = deriveFacets(scopeProducts);

  return (
    <PageContainer>
      <h1 className="text-display font-bold">{title}</h1>

      <div className="mt-6">
        <CatalogFilters
          basePath={basePath}
          facets={facets}
          filters={filters}
          showGender={scope.gender === undefined}
        />
      </div>

      <p aria-live="polite" className="mt-6 text-sm text-fg-muted">
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
        <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
