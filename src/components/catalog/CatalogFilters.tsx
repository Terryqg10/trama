import Link from 'next/link';
import type { Route } from 'next';
import { Check, ChevronDown } from 'lucide-react';
import { capitalize, type CatalogFacets } from '@/lib/catalog/facets';
import { swatchClass } from '@/lib/catalog/swatches';
import {
  GENDERS,
  OCCASIONS,
  SORTS,
  type CatalogFilters as Filters,
  type Gender,
} from '@/lib/catalog/filters';
import { FILTERS_SIDEBAR_ID } from './CatalogLayout';
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

/** Opciones de «Ordenar por», que vive en la barra sobre el listado (CA-12, T-073). */
export const SORT_OPTIONS: readonly Option[] = SORTS.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }));

/**
 * Sección plegable con una lista vertical de opciones (CA-13 y CA-14, T-074 y T-078). Es un `<details open>` nativo:
 * abierto por defecto, se pliega con teclado (Intro/Espacio) y funciona sin JavaScript. Cada opción es una fila de 44 px
 * con una casilla cuadrada con marca de verificación y el nombre al lado. Son **radios nativos** (selección única, sin
 * «Todas»): se elige una opción, se aplica al instante y se quita con «Limpiar». Plegar la sección no pierde el filtro
 * marcado (el contenido sigue en el formulario). La marca es un icono, no solo color (WCAG 1.4.1). La leyenda del
 * `<fieldset>` solo la leen los lectores de pantalla: la visible es el `<summary>`. Con `grid` las opciones cortas (las
 * tallas) van en dos columnas; con `swatches`, el color lleva su círculo de muestra (decorativo) junto al nombre.
 */
function OptionList({
  legend,
  name,
  options,
  selected,
  grid = false,
  swatches = false,
}: {
  readonly legend: string;
  readonly name: string;
  readonly options: readonly Option[];
  readonly selected: string | undefined;
  readonly grid?: boolean;
  readonly swatches?: boolean;
}) {
  const active = selected ? 1 : 0;
  return (
    <details open data-testid="filters-section" className="group min-w-0 border-b border-border pb-4">
      <summary
        data-testid="filters-section-summary"
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
      >
        <span className="flex items-center gap-2">
          {legend}
          <ActiveBadge active={active} testId="filters-section-count" />
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-fg motion-safe:transition-transform group-open:rotate-180"
        />
      </summary>
      <fieldset className="mt-1 min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div
          data-testid="filters-options"
          className={grid ? 'grid grid-cols-2 gap-x-4 gap-y-1' : 'flex flex-col gap-1'}
        >
          {options.map((option) => {
            const swatch = swatches ? swatchClass(option.value) : null;
            return (
              <label key={option.value} className="relative flex min-h-11 cursor-pointer items-center gap-3 text-sm text-fg">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  defaultChecked={selected === option.value}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-control border border-border-strong bg-surface peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                />
                <Check
                  aria-hidden="true"
                  className="absolute left-0.5 top-1/2 hidden size-4 -translate-y-1/2 text-accent-fg peer-checked:block"
                />
                {swatch ? (
                  <span
                    aria-hidden="true"
                    data-testid="filters-swatch"
                    className={`size-5 shrink-0 rounded-full border border-border-strong ${swatch}`}
                  />
                ) : null}
                <span className="min-w-0 peer-checked:font-semibold">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </details>
  );
}

/** Campo de precio: sin las flechas del navegador, que taparían el «€» (se escribe el importe). */
const priceFieldClass =
  'min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-surface ps-3 pe-8 text-sm text-fg ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';


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
 * Formulario de filtros: un formulario GET renderizado en servidor que
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
  const hasActive = activeCount(filters, showGender) > 0;

  const buttonLayout = footerSticky ? ' flex-1 justify-center whitespace-nowrap' : '';
  const applyButton = (
    <button
      type="submit"
      className={`inline-flex min-h-11 items-center rounded-control bg-accent text-sm font-semibold text-accent-fg hover:bg-accent-hover ${footerSticky ? 'px-3' : 'px-6'}${buttonLayout}`}
    >
      Aplicar filtros
    </button>
  );
  const clearLink = (
    <Link
      href={clearHref(basePath, filters.sort)}
      className={`inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface text-sm font-semibold text-fg hover:bg-accent-soft ${footerSticky ? 'px-3' : 'px-6'}${buttonLayout}`}
    >
      Limpiar
    </Link>
  );

  return (
    <FilterChips
      action={basePath}
      testId={testId}
      className={
        footerSticky
          ? 'flex min-h-full flex-col gap-5 border-t border-border p-5'
          : 'space-y-5 border-t border-border p-5'
      }
    >
      {showGender ? (
        <OptionList legend="Género" name="genero" options={genderOptions} selected={filters.gender} />
      ) : null}

      <OptionList
        legend="Categoría"
        name="categoria"
        options={facets.categories.map((c) => ({ value: c, label: capitalize(c) }))}
        selected={filters.category}
      />
      <OptionList
        legend="Ocasión"
        name="ocasion"
        options={OCCASIONS.map((o) => ({ value: o, label: capitalize(o) }))}
        selected={filters.occasion}
      />
      <OptionList
        legend="Talla"
        name="talla"
        options={facets.sizes.map((s) => ({ value: s, label: s }))}
        selected={filters.size}
        grid
      />
      <OptionList
        legend="Color"
        name="color"
        options={facets.colors.map((c) => ({ value: c, label: capitalize(c) }))}
        selected={filters.color}
        swatches
      />

      {/* Precio (CA-13): dos campos pequeños en una fila, «Mín.» y «Máx.», con un guion entre ellos y «€» dentro. Se
          aplican con «Aplicar filtros» (RF-04). Las etiquetas visibles son los marcadores; las accesibles, el texto
          `sr-only`. */}
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-fg">Precio</legend>
        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Precio mínimo (€)</span>
            <input
              type="number"
              name="min"
              inputMode="numeric"
              placeholder="Mín."
              min={0}
              max={99999}
              step={1}
              defaultValue={filters.minPriceCents === undefined ? '' : filters.minPriceCents / 100}
              className={priceFieldClass}
            />
            <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
              €
            </span>
          </label>
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Precio máximo (€)</span>
            <input
              type="number"
              name="max"
              inputMode="numeric"
              placeholder="Máx."
              min={0}
              max={99999}
              step={1}
              defaultValue={filters.maxPriceCents === undefined ? '' : filters.maxPriceCents / 100}
              className={priceFieldClass}
            />
            <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
              €
            </span>
          </label>
        </div>
      </fieldset>

      <div
        className={
          footerSticky
            ? 'sticky -bottom-5 z-10 -mx-5 -mb-5 mt-auto flex gap-3 border-t border-border bg-surface px-5 py-3'
            : 'flex flex-wrap gap-3'
        }
      >
        {/* Pie del drawer (estilo v1): Limpiar a la izquierda y Aplicar a la derecha. El orden del
            DOM es el visual, así que la tabulación coincide con lo que se ve. «Limpiar» solo aparece con
            filtros activos (CA-14). */}
        {footerSticky ? (hasActive ? clearLink : null) : applyButton}
        {footerSticky ? applyButton : hasActive ? clearLink : null}
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
      id={FILTERS_SIDEBAR_ID}
      aria-labelledby="filters-sidebar-title"
      data-testid="filters-sidebar"
      className="hidden lg:sticky lg:top-4 lg:block lg:max-h-dvh lg:w-(--filter-sidebar-width) lg:shrink-0 lg:self-start lg:overflow-y-auto lg:rounded-container lg:border lg:border-border lg:bg-surface"
    >
      <div className="flex min-h-11 items-center justify-between px-5 py-2">
        <h2 id="filters-sidebar-title" className="text-sm font-semibold text-fg">
          Filtros
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
