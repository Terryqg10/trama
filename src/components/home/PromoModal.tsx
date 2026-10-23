'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCartDrawer } from '@/components/cart/CartDrawerContext';
import { NewsletterForm } from './NewsletterForm';

export const PROMO_DELAY_MS = 3000;
export const PROMO_STORAGE_KEY = 'promo_seen';
export const PROMO_IMAGE = '/images/products/promo-regalo.webp';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** `true` si todavía no se ha visto. Sin acceso a `localStorage` no se muestra: no se podría recordar y saldría en cada visita. */
function neverSeen(): boolean {
  try {
    return window.localStorage.getItem(PROMO_STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(PROMO_STORAGE_KEY, '1');
  } catch {
    // Sin almacenamiento no hay nada que recordar.
  }
}

/**
 * Modal promocional de la portada (CA-127 a CA-131, T-089, Enmienda 38): a los 3 s ofrece un 10 % en la primera compra a cambio
 * de suscribirse a la newsletter. Se abre una sola vez por navegador (`promo_seen`) y no si el carrito lateral está abierto.
 * El foco entra en el diálogo, Tab lo recorre el componente (WebKit no tabula los enlaces, T-088), Esc, la X y el fondo lo cierran,
 * el `body` no hace scroll y el foco vuelve al cerrar. El botón «Probar promo» solo existe en desarrollo.
 */
export function PromoModal() {
  const [open, setOpen] = useState(false);
  const { isCartOpen } = useCartDrawer();
  const cartOpenRef = useRef(isCartOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cartOpenRef.current = isCartOpen;
  }, [isCartOpen]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!neverSeen()) return;
    const timer = window.setTimeout(() => {
      if (cartOpenRef.current) return;
      markSeen();
      setOpen(true);
    }, PROMO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    // Sin barra de desplazamiento la página se ensancha de golpe: se compensa con un relleno del mismo ancho.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    // El foco va al diálogo y no al campo, para no abrir el teclado del móvil.
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
    <>
      {open ? (
        <div data-testid="promo-modal-root" className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div aria-hidden="true" data-testid="promo-modal-backdrop" onClick={close} className="absolute inset-0 bg-fg/50" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            data-testid="promo-modal"
            className="promo-enter relative grid max-h-full w-full max-w-3xl overflow-y-auto rounded-container bg-surface shadow-2xl focus:outline-none md:grid-cols-2"
          >
            <button
              type="button"
              aria-label="Cerrar"
              data-testid="promo-modal-close"
              onClick={close}
              className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <div className="flex flex-col justify-center p-6 pt-14 md:p-10">
              <h2 id={titleId} className="font-serif text-3xl font-bold leading-tight text-fg md:text-4xl">
                Suscríbete y consigue un <span className="whitespace-nowrap">10 %</span> en tu primera compra
              </h2>
              <p id={descriptionId} className="mt-3 text-base text-fg-muted">
                Te enviaremos el código de descuento por email.
              </p>
              <NewsletterForm className="mt-6 w-full space-y-4 text-left" />
            </div>
            <div className="relative hidden min-h-80 md:block" data-testid="promo-modal-image">
              <Image src={PROMO_IMAGE} alt="" fill sizes="24rem" className="object-cover" />
            </div>
          </div>
        </div>
      ) : null}
      {process.env.NODE_ENV === 'development' && (
        <button
          type="button"
          data-testid="promo-test-button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-50 inline-flex min-h-11 items-center rounded-control bg-fg px-4 text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Probar promo
        </button>
      )}
    </>
  );
}
