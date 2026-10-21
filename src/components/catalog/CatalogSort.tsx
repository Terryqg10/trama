'use client';

import type { Route } from 'next';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';

export interface SortOption {
  readonly value: string;
  readonly label: string;
}

export interface HiddenField {
  readonly name: string;
  readonly value: string;
}

/**
 * «Ordenar por» de la barra sobre el listado (CA-12, T-073). Ya no vive dentro del formulario de filtros, así que
 * tiene su propio `<form method="get">` con los filtros vigentes en campos ocultos: sin JavaScript se envía con el
 * botón «Ordenar» (en `<noscript>`) y no pierde los filtros. Con JavaScript se aplica al cambiar, con navegación
 * blanda y sin recargar el documento (RF-03, Enmienda 2 de SPEC-002; ADR-006).
 */
export function CatalogSort({
  action,
  sort,
  options,
  hidden,
}: {
  readonly action: Route;
  readonly sort: string;
  readonly options: readonly SortOption[];
  /** Filtros vigentes (sin `orden`) para conservarlos al reordenar. */
  readonly hidden: readonly HiddenField[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(sort);
  const [pending, startTransition] = useTransition();

  // La URL manda: «Limpiar», «Atrás» o un enlace cambian el orden sin pasar por el selector. Se ajusta durante el
  // render (patrón de React para derivar estado de una prop), no en un efecto.
  const [syncedSort, setSyncedSort] = useState(sort);
  if (syncedSort !== sort) {
    setSyncedSort(sort);
    setValue(sort);
  }

  function apply(next: string): void {
    const params = new URLSearchParams();
    for (const field of hidden) params.set(field.name, field.value);
    params.set('orden', next);
    startTransition(() => {
      router.push(`${action}?${params.toString()}`, { scroll: false });
    });
  }

  function onChange(event: ChangeEvent<HTMLSelectElement>): void {
    setValue(event.target.value);
    apply(event.target.value);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    apply(value);
  }

  return (
    <form
      method="get"
      action={action}
      data-testid="catalog-sort"
      aria-busy={pending}
      onSubmit={onSubmit}
      className="flex items-center gap-2"
    >
      {hidden.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <label htmlFor="catalog-sort-select" className="text-sm font-semibold text-fg">
        Ordenar por
      </label>
      {/* Sin chevrón nativo (`appearance-none`): el de lucide va dentro del control, a la misma distancia del borde
          que el texto (`px-4`), y no bloquea clics. */}
      <span className="relative block">
        <select
          id="catalog-sort-select"
          name="orden"
          value={value}
          onChange={onChange}
          data-testid="filters-sort"
          className="min-h-11 appearance-none rounded-control border border-border-strong bg-surface px-4 pr-12 text-sm text-fg"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          data-testid="filters-sort-chevron"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-fg"
        />
      </span>
      <noscript>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Ordenar
        </button>
      </noscript>
    </form>
  );
}
