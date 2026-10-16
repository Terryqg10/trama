import Link from 'next/link';
import type { Route } from 'next';
import { Check } from 'lucide-react';
import { capitalize, type CatalogFacets } from '@/lib/catalog/facets';
import {
  GENDERS,
  OCCASIONS,
  SORTS,
  type CatalogFilters as Filters,
  type Gender,
} from '@/lib/catalog/filters';
import { FilterChips } from './FilterChips';
import { FiltersDrawer } from './FiltersDrawer';

interface Option {
  readonly value: string;
  readonly label: string;
}

const SORT_LABELS: Record<(typeof SORTS)[number], string> = {
  novedades: 'Novedades',
  'precio-asc': 'Precio: de menor a mayor',
  'precio-desc': 'Precio: de mayor a menor',
};

const chipBase =
  'inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface px-4 text-sm text-fg ' +
  'peer-checked:border-accent peer-checked:bg-accent peer-checked:pl-9 peer-checked:font-semibold peer-checked:text-accent-fg ' +
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent';

/**
 * Grupo de chips de una sola opción. Son radios nativos: funcionan sin JavaScript.
 * El chip seleccionado lleva una marca (icono) además del color: no depende solo
 * del color (WCAG AA).
 */
function ChipGroup({
  legend,
  name,
  options,
  selected,
}: {
  readonly legend: string;
  readonly name: string;
  readonly options: readonly Option[];
  readonly selected: string | undefined;
}) {
  const all: readonly Option[] = [{ value: '', label: 'Todas' }, ...options];
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-fg">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((option) => (
          <label key={option.value || 'todas'} className="relative inline-flex">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={(selected ?? '') === option.value}
              className="peer sr-only"
            />
            <Check
              aria-hidden="true"
              className="absolute left-3 top-1/2 hidden size-4 -translate-y-1/2 text-accent-fg peer-checked:block"
            />
            <span className={chipBase}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const fieldClass =
  'mt-1 min-h-11 w-full rounded-control border border-border-strong bg-surface px-4 text-sm text-fg';

function activeCount(filters: Filters, hasGenderFilter: boolean): number {
  return [
    hasGenderFilter && filters.gender,
    filters.category,
    filters.occasion,
    filters.size,
    filters.color,
    filters.minPriceCents !== undefined,
    filters.maxPriceCents !== undefined,
  ].filter(Boolean).length;
}

function ActiveBadge({ active, testId }: { readonly active: number; readonly testId: string }) {
  if (active === 0) return null;
  return (
    <span
      data-testid={testId}
      className="rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text"
    >
      {active} {active === 1 ? 'activo' : 'activos'}
    </span>
  );
}

/** "Limpiar" quita los filtros pero conserva el orden elegido (RF-06). */
function clearHref(basePath: Route, sort: Filters['sort']) {
  return sort === 'novedades' ? basePath : { pathname: basePath, query: { orden: sort } };
}

interface CatalogFiltersProps {
  readonly basePath: Route;
  readonly facets: CatalogFacets;
  readonly filters: Filters;
  /** Solo en Novedades, donde el género no viene fijado por la ruta. */
  readonly showGender: boolean;
}

/**
 * Formulario de filtros y orden: un formulario GET renderizado en servidor que
 * funciona sin JavaScript; `FilterChips` lo mejora con JavaScript (ADR-006). Se pinta
 * dos veces (columna lateral y panel móvil); solo uno está visible según el ancho,
 * y el oculto con `display: none` ni se envía ni se lee con lector de pantalla.
 */
function FilterForm({
  basePath,
  facets,
  filters,
  showGender,
  testId,
  footerSticky = false,
}: CatalogFiltersProps & { readonly testId: string; readonly footerSticky?: boolean }) {
  const genderOptions: Option[] = GENDERS.map((g: Gender) => ({ value: g, label: capitalize(g) }));

  const buttonLayout = footerSticky ? ' flex-1 justify-center' : '';
  const applyButton = (
    <button
      type="submit"
      className={`inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover${buttonLayout}`}
    >
      Aplicar filtros
    </button>
  );
  const clearLink = (
    <Link
      href={clearHref(basePath, filters.sort)}
      className={`inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface px-6 text-sm font-semibold text-fg hover:bg-accent-soft${buttonLayout}`}
    >
      Limpiar
    </Link>
  );

  return (
    <FilterChips
      action={basePath}
      testId={testId}
      className="space-y-5 border-t border-border p-5"
    >
      {showGender ? (
        <ChipGroup legend="Género" name="genero" options={genderOptions} selected={filters.gender} />
      ) : null}

      <ChipGroup
        legend="Categoría"
        name="categoria"
        options={facets.categories.map((c) => ({ value: c, label: capitalize(c) }))}
        selected={filters.category}
      />
      <ChipGroup
        legend="Ocasión"
        name="ocasion"
        options={OCCASIONS.map((o) => ({ value: o, label: capitalize(o) }))}
        selected={filters.occasion}
      />
      <ChipGroup
        legend="Talla"
        name="talla"
        options={facets.sizes.map((s) => ({ value: s, label: s }))}
        selected={filters.size}
      />
      <ChipGroup
        legend="Color"
        name="color"
        options={facets.colors.map((c) => ({ value: c, label: capitalize(c) }))}
        selected={filters.color}
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <label className="block text-sm font-semibold text-fg">
          Precio mínimo (€)
          <input
            type="number"
            name="min"
            inputMode="numeric"
            min={0}
            max={99999}
            step={1}
            defaultValue={filters.minPriceCents === undefined ? '' : filters.minPriceCents / 100}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-semibold text-fg">
          Precio máximo (€)
          <input
            type="number"
            name="max"
            inputMode="numeric"
            min={0}
            max={99999}
            step={1}
            defaultValue={filters.maxPriceCents === undefined ? '' : filters.maxPriceCents / 100}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-semibold text-fg">
          Ordenar por
          <select name="orden" defaultValue={filters.sort} className={fieldClass}>
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={
          footerSticky
            ? 'sticky -bottom-5 z-10 -mx-5 -mb-5 flex gap-3 border-t border-border bg-surface px-5 py-3'
            : 'flex flex-wrap gap-3'
        }
      >
        {/* Pie del drawer (estilo v1): Limpiar a la izquierda y Aplicar a la derecha. El orden del
            DOM es el visual, así que la tabulación coincide con lo que se ve. */}
        {footerSticky ? clearLink : applyButton}
        {footerSticky ? applyButton : clearLink}
      </div>
    </FilterChips>
  );
}

/**
 * Columna lateral de filtros (RF-01, RF-05, RF-08): solo en escritorio (≥ lg),
 * siempre visible y fija al hacer scroll. Ancho: `--filter-sidebar-width`.
 */
export function FiltersSidebar(props: CatalogFiltersProps) {
  const active = activeCount(props.filters, props.showGender);
  return (
    <aside
      aria-labelledby="filters-sidebar-title"
      data-testid="filters-sidebar"
      className="hidden lg:sticky lg:top-4 lg:block lg:max-h-dvh lg:w-(--filter-sidebar-width) lg:shrink-0 lg:self-start lg:overflow-y-auto lg:rounded-container lg:border lg:border-border lg:bg-surface"
    >
      <div className="flex min-h-11 items-center justify-between px-5 py-2">
        <h2 id="filters-sidebar-title" className="text-sm font-semibold text-fg">
          Filtros y orden
        </h2>
        <ActiveBadge active={active} testId="filters-count" />
      </div>
      <FilterForm {...props} testId="filters-panel" />
    </aside>
  );
}

/**
 * Drawer de móvil y tablet (< lg): botón «Filtros» con contador y panel a pantalla
 * completa (RF-02, RF-05). Ver `FiltersDrawer`.
 */
export function FiltersMobile(props: CatalogFiltersProps) {
  const active = activeCount(props.filters, props.showGender);
  return (
    <FiltersDrawer activeCount={active}>
      <FilterForm {...props} testId="filters-panel-mobile" footerSticky />
    </FiltersDrawer>
  );
}
