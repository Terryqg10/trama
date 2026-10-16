'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

const DRAWER_ID = 'filtros-movil';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Drawer de filtros a pantalla completa para móvil y tablet (SPEC-002 RF-02, RF-05).
 *
 * Mejora progresiva (ADR-006): el botón es un enlace a `#filtros-movil` y el panel se
 * muestra con `:target`, así que sin JavaScript también se abre y se cierra. Con
 * JavaScript se gestiona por estado: Esc cierra, el foco queda atrapado dentro, se
 * bloquea el scroll de fondo y el foco vuelve al botón. No hay animación: el cambio es
 * instantáneo, así que `prefers-reduced-motion` ya queda cubierto.
 */
export function FiltersDrawer({
  activeCount,
  children,
}: {
  readonly activeCount: number;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);
  const wasOpen = useRef(false);

  function close(): void {
    if (window.location.hash === `#${DRAWER_ID}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setOpen(false);
  }

  // Foco al abrir (en el botón de cerrar) y al cerrar (de vuelta al botón «Filtros»).
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Sin scroll de fondo mientras el drawer está abierto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Si la pantalla crece hasta el escritorio, aparece la columna lateral: se cierra el drawer.
  useEffect(() => {
    if (!open) return;
    const width = getComputedStyle(document.documentElement).getPropertyValue('--bp-lg').trim();
    if (!width) return;
    const query = window.matchMedia(`(min-width: ${width})`);
    const onChange = (event: MediaQueryListEvent): void => {
      if (event.matches) setOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  // Trampa de foco con dos centinelas (a la entrada y a la salida del drawer). No se mide
  // el primer y el último elemento: en Safari los enlaces no se alcanzan con Tab, así que el
  // «último» podría no ser el último tabulable.
  function focusEdge(edge: 'first' | 'last'): void {
    const items = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const target = edge === 'first' ? items[0] : items[items.length - 1];
    target?.focus();
  }

  // «Limpiar» (enlace) y el envío con «Aplicar filtros» cierran el drawer para ver el
  // resultado; los chips y los campos no.
  function onClick(event: MouseEvent<HTMLDivElement>): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href]');
    if (link && link !== closeRef.current && drawerRef.current?.contains(link)) setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <a
        ref={triggerRef}
        href={`#${DRAWER_ID}`}
        data-testid="filters-open"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
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
        onKeyDown={onKeyDown}
        onClick={onClick}
        onSubmit={() => setOpen(false)}
        className={
          open
            ? 'fixed inset-0 z-50 flex flex-col bg-bg'
            : 'hidden target:fixed target:inset-0 target:z-50 target:flex target:flex-col target:bg-bg'
        }
      >
        <span tabIndex={0} onFocus={() => focusEdge('last')} data-focus-guard="start" />
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
            href="#"
            aria-label="Cerrar filtros"
            data-testid="filters-close"
            onClick={(event) => {
              event.preventDefault();
              close();
            }}
            className="inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft"
          >
            <X aria-hidden="true" className="size-5" />
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface">{children}</div>
        <span tabIndex={0} onFocus={() => focusEdge('first')} data-focus-guard="end" />
      </div>
    </div>
  );
}
