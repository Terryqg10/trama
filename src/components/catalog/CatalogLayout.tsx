'use client';

import { SlidersHorizontal } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useHydrated } from '@/lib/cart/store';

/** `id` de la columna lateral: el botón de ocultar la referencia con `aria-controls`. */
export const FILTERS_SIDEBAR_ID = 'filters-sidebar';

interface FiltersVisibility {
  readonly hidden: boolean;
  readonly toggle: () => void;
}

const FiltersVisibilityContext = createContext<FiltersVisibility>({ hidden: false, toggle: () => undefined });

/**
 * Estado de «Ocultar filtros» (CA-12, T-073): solo en React, sin guardarlo entre visitas (SPEC-002, sección 2). Sin
 * JavaScript no hay estado ni botón, y el panel queda visible (RF-08).
 */
export function FiltersVisibilityProvider({ children }: { readonly children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <FiltersVisibilityContext value={{ hidden, toggle: () => setHidden((value) => !value) }}>
      {children}
    </FiltersVisibilityContext>
  );
}

/**
 * Botón «Ocultar filtros» / «Mostrar filtros». Solo con JavaScript (no se pinta hasta hidratar) y solo desde `--bp-lg`,
 * donde existe la columna lateral; por debajo, el drawer no cambia.
 */
export function FiltersToggleButton() {
  const { hidden, toggle } = useContext(FiltersVisibilityContext);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <button
      type="button"
      data-testid="filters-toggle"
      aria-expanded={!hidden}
      aria-controls={FILTERS_SIDEBAR_ID}
      onClick={toggle}
      className="hidden min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:inline-flex"
    >
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      {hidden ? 'Mostrar filtros' : 'Ocultar filtros'}
    </button>
  );
}

/**
 * Envoltorio de la columna lateral: no añade caja (`display: contents`) y la oculta entera al ocultar los filtros. La
 * columna sigue en el DOM, así que `aria-controls` apunta a algo que existe.
 */
export function CollapsibleSidebar({ children }: { readonly children: ReactNode }) {
  const { hidden } = useContext(FiltersVisibilityContext);
  return (
    <div data-testid="filters-collapsible" className={hidden ? 'hidden' : 'contents'}>
      {children}
    </div>
  );
}

/**
 * Rejilla de productos: 2 columnas hasta `--bp-md`, 3 desde ahí y, con los filtros ocultos, 4 desde `--bp-lg` (CA-12).
 * Con la columna lateral se mantienen 3 (PLAN-001 §5b, T-016).
 */
export function ProductGrid({ children }: { readonly children: ReactNode }) {
  const { hidden } = useContext(FiltersVisibilityContext);
  return (
    <ul
      data-testid="product-grid"
      className={`mt-4 grid grid-cols-2 gap-4 md:grid-cols-3${hidden ? ' lg:grid-cols-4' : ''}`}
    >
      {children}
    </ul>
  );
}
