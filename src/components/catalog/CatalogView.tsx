import Link from 'next/link';
import type { Route } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { loadCardFavoriteIds } from '@/lib/favorites/card-favorites';
import { deriveFacets } from '@/lib/catalog/facets';
import {
  parseCatalogParams,
  type CatalogFilters as Filters,
  type Gender,
  type RawSearchParams,
} from '@/lib/catalog/filters';
import { listProducts } from '@/lib/catalog/queries';
import { PageContainer } from '../PageContainer';
import { FiltersMobile, FiltersSidebar, SORT_OPTIONS } from './CatalogFilters';
import {
  CollapsibleSidebar,
  FiltersToggleButton,
  FiltersVisibilityProvider,
  ProductGrid,
} from './CatalogLayout';
import { CatalogSort, type HiddenField } from './CatalogSort';
import { ProductCard } from './ProductCard';

export interface CatalogScope {
  /** Género fijado por la ruta (/hombre, /mujer). Prevalece sobre el parámetro. */
  readonly gender?: Gender;
  /** Solo productos nuevos (/novedades). */
  readonly onlyNew?: boolean;
}

const linkButton =
  'inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover';

/** Filtros vigentes (sin el orden) como campos ocultos del formulario de «Ordenar por», para no perderlos al reordenar. */
function filterFields(filters: Filters, showGender: boolean): HiddenField[] {
  const fields: HiddenField[] = [];
  if (showGender && filters.gender) fields.push({ name: 'genero', value: filters.gender });
  if (filters.category) fields.push({ name: 'categoria', value: filters.category });
  if (filters.occasion) fields.push({ name: 'ocasion', value: filters.occasion });
  if (filters.size) fields.push({ name: 'talla', value: filters.size });
  if (filters.color) fields.push({ name: 'color', value: filters.color });
  if (filters.minPriceCents !== undefined) fields.push({ name: 'min', value: String(filters.minPriceCents / 100) });
  if (filters.maxPriceCents !== undefined) fields.push({ name: 'max', value: String(filters.maxPriceCents / 100) });
  return fields;
}

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
  // La compra rápida de la tarjeta (CA-120) necesita saber si hay sesión: con ella el carrito va a la cuenta.
  const { client, user } = await getCurrentUser();
  const favoriteIds = await loadCardFavoriteIds(client, user !== null);

  const filterProps = { basePath, facets, filters, showGender: scope.gender === undefined };

  return (
    <PageContainer>
      <h1 className="text-display font-bold">{title}</h1>

      <FiltersVisibilityProvider>
        <div className="mt-6 lg:flex lg:items-start lg:gap-8">
          <CollapsibleSidebar>
            <FiltersSidebar {...filterProps} />
          </CollapsibleSidebar>

          <div className="min-w-0 lg:flex-1">
            {/* Barra del listado (CA-12): recuento y filtros del drawer a la izquierda; ocultar filtros y «Ordenar por» a la derecha. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p aria-live="polite" className="text-sm text-fg-muted">
                  {products.length} {products.length === 1 ? 'producto' : 'productos'}
                </p>
                <FiltersMobile {...filterProps} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <FiltersToggleButton />
                <CatalogSort
                  action={basePath}
                  sort={filters.sort}
                  options={SORT_OPTIONS}
                  hidden={filterFields(filters, filterProps.showGender)}
                />
              </div>
            </div>

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
              // Rejilla del estilo v1: 2 columnas hasta `--bp-md` y 3 desde `--bp-md`. Con la columna lateral
              // (≥ `--bp-lg`) se mantienen 3, no 4 (PLAN-001 §5b, T-016); con los filtros ocultos pasa a 4 (CA-12).
              <ProductGrid>
                {products.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard product={product} priority={index === 0} quickAdd={{ signedIn: user !== null, favoriteIds }} />
                  </li>
                ))}
              </ProductGrid>
            )}
          </div>
        </div>
      </FiltersVisibilityProvider>
    </PageContainer>
  );
}
