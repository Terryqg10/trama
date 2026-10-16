'use client';

import { Ruler, X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useHashOverlay } from '../useHashOverlay';

const MODAL_ID = 'guia-de-tallas';

/**
 * Panel de la guía de tallas, abierto desde la ficha (RF-18, CA-31). Mejora progresiva igual que
 * el drawer de filtros y el menú móvil: el botón es un enlace a `#guia-de-tallas` y el panel se
 * muestra con `:target` sin JavaScript. Con JavaScript lo gestiona `useHashOverlay` (hash de
 * entrada, Esc, foco atrapado y devuelto, sin scroll de fondo). Se cierra con Esc, con el botón y
 * pulsando fuera del panel. La tabla llega ya pintada por el servidor (`children`).
 */
export function SizeGuideModal({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);
  // Sirve en todos los tamaños de pantalla: no se cierra al cruzar ningún punto de corte.
  const overlay = useHashOverlay(MODAL_ID, null, {
    trigger: triggerRef,
    overlay: modalRef,
    close: closeRef,
  });

  return (
    <>
      <a
        ref={triggerRef}
        href={`#${MODAL_ID}`}
        data-testid="size-guide-open"
        aria-haspopup="dialog"
        aria-expanded={overlay.open}
        onClick={(event) => {
          event.preventDefault();
          overlay.openOverlay();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-control px-1 text-sm font-medium text-accent-text underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Ruler aria-hidden="true" className="size-4" />
        Guía de tallas
      </a>

      <div
        ref={modalRef}
        id={MODAL_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        data-testid="size-guide-modal"
        onKeyDown={overlay.onKeyDown}
        onClick={(event) => {
          // Un clic en el fondo (fuera del panel) cierra; los enlaces del panel los gestiona el hook.
          if (event.target === event.currentTarget) overlay.close();
          else overlay.onClick(event);
        }}
        className={
          overlay.open
            ? 'fixed inset-0 z-50 flex items-end justify-center bg-fg/50 sm:items-center sm:p-6'
            : overlay.mounted
              ? 'hidden'
              : 'hidden target:fixed target:inset-0 target:z-50 target:flex target:items-end target:justify-center target:bg-fg/50 sm:target:items-center sm:target:p-6'
        }
      >
        <span tabIndex={0} onFocus={() => overlay.focusEdge('last')} data-focus-guard="start" />
        <div className="flex max-h-full w-full flex-col overflow-hidden rounded-t-container bg-surface shadow-card sm:max-w-2xl sm:rounded-container">
          <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-border px-5">
            <h2 id="size-guide-title" className="text-base font-semibold text-fg">
              {title}
            </h2>
            <a
              ref={closeRef}
              href="#cerrar-guia-de-tallas"
              aria-label="Cerrar guía de tallas"
              data-testid="size-guide-close"
              onClick={(event) => {
                event.preventDefault();
                overlay.close();
              }}
              className="inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft"
            >
              <X aria-hidden="true" className="size-5" />
            </a>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </div>
        <span tabIndex={0} onFocus={() => overlay.focusEdge('first')} data-focus-guard="end" />
      </div>
    </>
  );
}
