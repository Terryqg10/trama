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

const PHONE_PHOTOS = [
  '/images/products/abrigo-pano-gris.webp',
  '/images/products/jersey-punto-crema.webp',
  '/images/products/bomber-negra.webp',
  '/images/products/chaqueta-vaquera-oversize.webp',
] as const;

function PhoneMockup() {
  return (
    <div aria-hidden="true" data-testid="phone-mockup" className="mx-auto w-56 md:w-64 lg:w-72">
      <div className="rounded-container border-4 border-fg bg-fg p-1 shadow-card">
        <div className="overflow-clip rounded-card bg-surface">
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-fg/80" />
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-bold text-fg">Trama</span>
            <span className="size-4 rounded-full bg-accent-soft" />
          </div>
          <div className="px-3">
            <span className="inline-flex rounded-control bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
              Novedades
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {PHONE_PHOTOS.map((src) => (
              <div key={src} className="relative aspect-3/4 overflow-clip rounded-card bg-surface-muted">
                <Image src={src} alt="" fill unoptimized sizes="7rem" className="object-cover" />
              </div>
            ))}
          </div>
          <div className="flex justify-around border-t border-border py-3">
            <span className="size-4 rounded-full bg-accent" />
            <span className="size-4 rounded-full bg-surface-muted" />
            <span className="size-4 rounded-full bg-surface-muted" />
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
    <section aria-labelledby="movil-titulo" data-testid="mobile-app" className="border-t border-border bg-surface">
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
