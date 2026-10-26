'use client';

import { Smartphone, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * «Trama en tu móvil» (RF-13 a RF-16, CA-14 a CA-16, T-106, SPEC-005). Es una demostración: no existe ninguna app. El teléfono
 * está maquetado en HTML y CSS con fotos que ya están en la tienda (DP-8 B), sin imágenes nuevas ni servicios de pago. Los dos
 * botones de tienda son propios (no las insignias oficiales) y no enlazan a ninguna tienda real: abren un diálogo «App no
 * disponible» (DP-7 A), porque un enlace muerto o falso rompe la puerta 7. La sección es decorativa salvo el texto, los botones
 * y el aviso de demostración.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const STORE_BUTTONS = ['App Store', 'Google Play'] as const;

/** Captura real de la portada a 390 × 844 px (densidad 3), hecha con Playwright y optimizada con el pipeline (ADR-009, T-112). */
export const PHONE_SCREEN = '/images/hero/hero-app-pantalla.webp';

/** Botón lateral del teléfono (silencio, volumen, encendido): una pieza fina pegada al marco. */
function SideButton({ side, className }: { readonly side: 'left' | 'right'; readonly className: string }) {
  return (
    <span
      className={`absolute w-1 bg-border-strong ${side === 'left' ? '-left-0.5 rounded-l-sm' : '-right-0.5 rounded-r-sm'} ${className}`}
    />
  );
}

/**
 * Teléfono realista (RF-16, CA-25 y CA-26, T-112): marco de titanio con degradado, bisel negro, isla dinámica, botones laterales,
 * reflejo en la pantalla, sombra e inclinación en 3D; la pantalla es una captura real de la portada. Decorativo (`aria-hidden`)
 * y estático. Sin marcas ni logotipos. En móvil se inclina menos para no salirse del viewport.
 */
function PhoneMockup() {
  return (
    <div aria-hidden="true" data-testid="phone-mockup" className="mx-auto w-52 perspective-distant md:w-60 lg:w-64">
      <div className="relative transform-3d rotate-z-3 rotate-x-3 -rotate-y-6 md:rotate-z-6 md:rotate-x-6 md:-rotate-y-12">
        <SideButton side="left" className="top-16 h-6" />
        <SideButton side="left" className="top-28 h-10" />
        <SideButton side="left" className="top-40 h-10" />
        <SideButton side="right" className="top-32 h-16" />
        <div className="rounded-4xl bg-linear-to-br from-border via-border-strong to-border p-0.5 shadow-2xl">
          <div className="rounded-4xl bg-fg p-2">
            <div data-testid="phone-screen" className="relative flex aspect-9/19 flex-col overflow-clip rounded-3xl bg-surface">
              {/* Barra de estado: la hora y tres piezas (señal, red y batería) a los lados de la isla dinámica. */}
              <div className="flex h-9 shrink-0 items-end justify-between px-4 pb-1 text-xs font-semibold text-fg">
                <span>9:41</span>
                <span className="flex items-center gap-0.5">
                  <span className="h-2 w-2.5 rounded-sm bg-fg" />
                  <span className="h-2 w-2 rounded-full bg-fg" />
                  <span className="h-2.5 w-3.5 rounded-sm bg-fg" />
                </span>
              </div>
              <div className="relative min-h-0 flex-1">
                <Image src={PHONE_SCREEN} alt="" fill unoptimized sizes="16rem" className="object-cover object-top" />
              </div>
              <span className="absolute left-1/2 top-2 h-5 w-16 -translate-x-1/2 rounded-full bg-fg" />
              <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-surface/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileAppSection() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      event.preventDefault();
      if (!first || !last) return;
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? items.indexOf(active) : -1;
      if (index === -1) {
        (event.shiftKey ? last : first).focus();
      } else {
        const step = event.shiftKey ? -1 : 1;
        items[(index + step + items.length) % items.length]?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, close]);

  return (
    <section aria-labelledby="movil-titulo" data-testid="mobile-app" className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-(--layout-gutter) py-12 md:grid-cols-2 md:gap-16 md:py-16 lg:py-20">
        <div>
          <h2 id="movil-titulo" className="text-2xl font-bold text-fg md:text-3xl">
            Trama en tu móvil
          </h2>
          <p className="mt-3 max-w-(--layout-prose-max) text-base text-fg-muted">
            Imagina tener Trama siempre a mano: novedades, ofertas y tu cesta en el bolsillo.
          </p>
          <p
            role="note"
            data-testid="mobile-app-note"
            className="mt-4 max-w-(--layout-prose-max) rounded-control border border-border bg-surface px-4 py-3 text-sm font-medium text-fg"
          >
            Trama es un proyecto de demostración: no existe una app real.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {STORE_BUTTONS.map((store) => (
              <button
                key={store}
                type="button"
                data-testid="store-button"
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-control bg-fg px-5 text-sm font-semibold text-bg hover:bg-fg/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Smartphone aria-hidden="true" className="size-5" />
                {store}
              </button>
            ))}
          </div>
        </div>
        <PhoneMockup />
      </div>

      {open ? (
        <div data-testid="app-dialog-root" className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div aria-hidden="true" data-testid="app-dialog-backdrop" onClick={close} className="absolute inset-0 bg-fg/50" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            data-testid="app-dialog"
            className="promo-enter relative w-full max-w-md rounded-container bg-surface p-6 shadow-2xl focus:outline-none md:p-8"
          >
            <button
              type="button"
              aria-label="Cerrar"
              data-testid="app-dialog-close"
              onClick={close}
              className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <h3 id={titleId} className="pr-10 text-xl font-bold text-fg">
              App no disponible
            </h3>
            <p id={descriptionId} className="mt-3 text-base text-fg-muted">
              Esto es una demostración: Trama todavía no tiene app para el móvil. Puedes seguir comprando desde esta web, que
              funciona en cualquier pantalla.
            </p>
            <Link
              href="/novedades"
              className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Ver novedades
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
