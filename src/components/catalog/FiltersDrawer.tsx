'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useHashOverlay } from '../useHashOverlay';

const DRAWER_ID = 'filtros-movil';

/**
 * Drawer de filtros a pantalla completa para móvil y tablet (SPEC-002 RF-02, RF-05).
 *
 * Mejora progresiva (ADR-006): el botón es un enlace a `#filtros-movil` y el panel se
 * muestra con `:target`, así que sin JavaScript también se abre y se cierra. Con
 * JavaScript lo gestiona `useHashOverlay` (hash de entrada, Esc, foco, scroll de fondo).
 * No hay animación: el cambio es instantáneo, así que `prefers-reduced-motion` ya queda
 * cubierto. Hash y `:target`: SPEC-002, Enmienda 3.
 */
export function FiltersDrawer({
  activeCount,
  children,
}: {
  readonly activeCount: number;
  readonly children: ReactNode;
}) {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);
  const overlay = useHashOverlay(DRAWER_ID, '--bp-lg', {
    trigger: triggerRef,
    overlay: drawerRef,
    close: closeRef,
  });

  return (
    <div className="lg:hidden">
      <a
        ref={triggerRef}
        href={`#${DRAWER_ID}`}
        data-testid="filters-open"
        aria-haspopup="dialog"
        aria-expanded={overlay.open}
        onClick={(event) => {
          event.preventDefault();
          overlay.openOverlay();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-accent-soft"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtros
        {activeCount > 0 ? (
          <span
            data-testid="filters-count-mobile"
            className="rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text"
          >
            {activeCount} {activeCount === 1 ? 'activo' : 'activos'}
          </span>
        ) : null}
      </a>

      <div
        ref={drawerRef}
        id={DRAWER_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-drawer-title"
        data-testid="filters-drawer"
        onKeyDown={overlay.onKeyDown}
        onClick={overlay.onClick}
        onSubmit={overlay.close}
        className={
          overlay.open
            ? 'fixed inset-0 z-50 flex flex-col bg-bg'
            : overlay.mounted
              ? 'hidden'
              : 'hidden target:fixed target:inset-0 target:z-50 target:flex target:flex-col target:bg-bg'
        }
      >
        <span tabIndex={0} onFocus={() => overlay.focusEdge('last')} data-focus-guard="start" />
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
          <div className="flex items-center gap-3">
            <h2 id="filters-drawer-title" className="text-base font-semibold text-fg">
              Filtros
            </h2>
            {activeCount > 0 ? (
              <span
                data-testid="filters-count-drawer"
                className="rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text"
              >
                {activeCount} {activeCount === 1 ? 'activo' : 'activos'}
              </span>
            ) : null}
          </div>
          <a
            ref={closeRef}
            href="#cerrar-filtros"
            aria-label="Cerrar filtros"
            data-testid="filters-close"
            onClick={(event) => {
              event.preventDefault();
              overlay.close();
            }}
            className="inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft"
          >
            <X aria-hidden="true" className="size-5" />
          </a>
        </div>
        <div className="min-h-0 flex-1 scroll-pb-24 overflow-y-auto bg-surface">{children}</div>
        <span tabIndex={0} onFocus={() => overlay.focusEdge('first')} data-focus-guard="end" />
      </div>
    </div>
  );
}
