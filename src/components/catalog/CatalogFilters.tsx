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

/**
 * Panel de filtros y orden: un formulario GET renderizado en servidor. Cada envío
 * recarga la página con los parámetros en la URL (sin JavaScript).
 */
export function CatalogFilters({
  basePath,
  facets,
  filters,
  showGender,
}: {
  readonly basePath: Route;
  readonly facets: CatalogFacets;
  readonly filters: Filters;
  /** Solo en Novedades, donde el género no viene fijado por la ruta. */
  readonly showGender: boolean;
}) {
  const active = activeCount(filters, showGender);
  const genderOptions: Option[] = GENDERS.map((g: Gender) => ({ value: g, label: capitalize(g) }));

  return (
    <details open={active > 0} className="rounded-container border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between px-5 text-sm font-semibold text-fg">
        <span>Filtros y orden</span>
        {active > 0 ? (
          <span className="rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
            {active} {active === 1 ? 'activo' : 'activos'}
          </span>
        ) : null}
      </summary>

      <form method="get" action={basePath} className="space-y-5 border-t border-border p-5">
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

        <div className="grid gap-4 sm:grid-cols-3">
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

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Aplicar filtros
          </button>
          <Link
            href={basePath}
            className="inline-flex min-h-11 items-center rounded-control border border-border-strong bg-surface px-6 text-sm font-semibold text-fg hover:bg-accent-soft"
          >
            Limpiar
          </Link>
        </div>
      </form>
    </details>
  );
}
