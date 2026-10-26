'use client';

import { Minus, Plus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getAccountCartAction } from '@/lib/cart/actions';
import type { SavedCart } from '@/lib/cart/cart';
import { useCart } from '@/lib/cart/use-cart';
import { capitalize } from '@/lib/catalog/facets';
import { isPhotoPath } from '@/lib/catalog/image-path';
import { withDiscount } from '@/lib/coupons/amounts';
import { readStoredCoupon, type StoredCoupon } from '@/lib/coupons/stored-coupon';
import { formatEuros } from '@/lib/domain/shop';
import { useCartDrawer } from './CartDrawerContext';
import { CartCoupon } from './CartCoupon';
import { CompleteLook } from './CompleteLook';
import { PaymentIcons } from './PaymentIcons';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const stepButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border-strong bg-surface text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-fg-muted';
const textButton =
  'inline-flex min-h-11 items-center rounded-control px-2 text-sm font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const primaryButton =
  'inline-flex min-h-12 w-full items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const secondaryButton =
  'inline-flex min-h-12 w-full items-center justify-center rounded-control border border-border-strong bg-surface px-6 text-base font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Carrito lateral (CA-124 y CA-125, T-085, Enmienda 37): panel a la derecha con fondo oscuro que se abre al añadir una prenda y
 * con el icono de la cabecera. Siempre está montado y se oculta con `invisible` tras la salida (la transición de visibilidad solo
 * se declara en el estado cerrado: al abrir la raíz es visible al instante, para poder enfocar el botón de cerrar, y al cerrar
 * tarda lo que la animación), así que cerrado no recibe foco ni lo leen los lectores de pantalla; el cuerpo se vuelve a montar en cada apertura
 * (`openCount`) para leer datos frescos. Entra deslizándose desde la derecha con `transform` y `opacity`; con
 * `prefers-reduced-motion` no hay transición. Abierto: el foco entra y queda atrapado, Esc lo cierra, no hay scroll del `body` y el
 * foco vuelve a donde estaba al cerrar. Va por encima de la cabecera (`z-50`).
 */
export function CartDrawer() {
  const { isCartOpen, closeCart, openCount, openerRef } = useCartDrawer();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isCartOpen) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    // Al quitar el scroll del body desaparece la barra de desplazamiento y la página se ensancha de golpe (un salto): se
    // compensa con un relleno del mismo ancho mientras el carrito está abierto.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      // El recorrido lo hacemos nosotros, no el navegador: WebKit/Safari no incluye los enlaces en el orden de Tab y, si el último
      // elemento es un enlace, el foco se escapaba del diálogo al pulsar Tab desde el último botón (T-088).
      event.preventDefault();
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
  }, [isCartOpen, closeCart, openerRef]);

  return (
    <div
      data-testid="cart-drawer-root"
      className={`fixed inset-0 z-60 ${
        isCartOpen ? 'visible' : 'pointer-events-none invisible transition-all duration-300 motion-reduce:transition-none'
      }`}
    >
      <div
        aria-hidden="true"
        data-testid="cart-drawer-backdrop"
        onClick={closeCart}
        className={`absolute inset-0 bg-fg/50 transition-opacity duration-300 motion-reduce:transition-none ${
          isCartOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        data-testid="cart-drawer"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl transition duration-300 motion-reduce:transition-none ${
          isCartOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <h2 id="cart-drawer-title" className="text-lg font-semibold text-fg">
            Mi cesta
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar la cesta"
            data-testid="cart-drawer-close"
            onClick={closeCart}
            className="inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {/* El cuerpo no se monta hasta la primera apertura (no hay consultas al cargar cada página) y se remonta en cada una. */}
        {openCount > 0 ? <DrawerCart key={openCount} /> : null}
      </div>
    </div>
  );
}

/** Decide si el carrito es el de la cuenta o el del navegador: el layout no lee la sesión, así que se pregunta al abrir. */
function DrawerCart() {
  const [mode, setMode] = useState<'loading' | 'guest' | { readonly cart: SavedCart }>('loading');

  useEffect(() => {
    let cancelled = false;
    void getAccountCartAction()
      .then((result) => {
        if (!cancelled) setMode(result.status === 'ok' ? { cart: result.cart } : 'guest');
      })
      .catch(() => {
        if (!cancelled) setMode('guest');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === 'loading') {
    return (
      <p role="status" className="p-5 text-fg-muted">
        Cargando tu cesta…
      </p>
    );
  }
  return <DrawerLines {...(mode === 'guest' ? {} : { accountCart: mode.cart })} />;
}

function DrawerLines({ accountCart }: { readonly accountCart?: SavedCart }) {
  const cart = useCart(accountCart);
  const { closeCart } = useCartDrawer();
  const { isAccount, status, lines, totals, savingsCents, notice, change, remove, add, retry } = cart;
  // Código del carrito lateral (CA-151): solo cuenta con sesión. El descuento se recalcula aquí con el porcentaje que dio el servidor.
  const [storedCoupon, setCoupon] = useState<StoredCoupon | null>(() => readStoredCoupon());
  const coupon = isAccount ? storedCoupon : null;
  const discounted = coupon && totals.subtotalCents > 0 ? withDiscount(totals, coupon.percentOff) : null;

  if (status === 'loading') {
    return (
      <p role="status" className="p-5 text-fg-muted">
        Cargando tu cesta…
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex-1 p-5">
        <p role="alert" className="text-lg font-semibold text-danger">
          No hemos podido cargar tu cesta.
        </p>
        <p className="mt-2 text-fg-muted">Tus prendas siguen guardadas. Inténtalo de nuevo.</p>
        <button type="button" onClick={retry} className={`${primaryButton} mt-6`}>
          Reintentar
        </button>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div data-testid="cart-drawer-empty" className="flex flex-1 flex-col justify-center gap-6 p-5 text-center">
        <div aria-live="polite" className="sr-only">
          {notice?.variantId === null ? notice.text : ''}
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">Tu cesta está vacía</p>
          <p className="mt-2 text-fg-muted">Añade prendas desde el catálogo para verlas aquí.</p>
        </div>
        <button type="button" data-testid="cart-drawer-continue" onClick={closeCart} className={secondaryButton}>
          Seguir comprando
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5" data-testid="cart-drawer-body">
        <div aria-live="polite" className="sr-only">
          {notice?.variantId === null ? notice.text : ''}
        </div>
        <ul className="divide-y divide-border">
          {lines.map(({ saved: line, info, state, qty }) => {
            const name = info ? `${info.productName}, talla ${info.size}, color ${info.color}` : 'Artículo';
            const discounted = info !== null && info.compareAtCents !== null && info.compareAtCents > info.priceCents;
            return (
              <li key={line.variantId} data-testid="drawer-line" data-state={state} className="py-5">
                {info ? (
                  <div className="flex gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-control border border-border bg-surface-muted">
                      {info.image ? (
                        <Image
                          src={info.image.path}
                          alt={info.image.alt}
                          width={160}
                          height={160}
                          unoptimized
                          className={
                            isPhotoPath(info.image.path) ? 'h-full w-full object-cover object-top' : 'h-full w-full object-contain p-1'
                          }
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={{ pathname: `/producto/${info.slug}`, query: { color: info.color, talla: info.size } }}
                        onClick={closeCart}
                        className="font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {info.productName}
                      </Link>
                      <p className="mt-1 text-sm text-fg-muted">
                        Talla {info.size} · {capitalize(info.color)}
                      </p>
                      <p data-testid="drawer-unit-price" className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-fg-muted">
                        <span>{formatEuros(info.priceCents)} por unidad</span>
                        {discounted && info.compareAtCents !== null ? (
                          <del data-testid="drawer-unit-before" className="line-through">
                            {formatEuros(info.compareAtCents)}
                          </del>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-fg">Este artículo ya no está disponible.</p>
                )}

                {state === 'missing' ? <p className="mt-2 text-sm text-fg-muted">No cuenta en el total. Quítalo para seguir.</p> : null}
                {state === 'soldOut' ? <p className="mt-2 text-sm font-medium text-danger">Agotado. No cuenta en el total.</p> : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {state === 'ok' && info ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Quitar una unidad de ${name}`}
                          data-testid="drawer-minus"
                          onClick={() => change(line.variantId, qty - 1, info)}
                          className={stepButton}
                        >
                          <Minus aria-hidden="true" className="size-4" />
                        </button>
                        <span data-testid="drawer-qty" aria-label={`Cantidad de ${name}`} className="min-w-8 text-center text-base font-semibold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Añadir una unidad de ${name}`}
                          data-testid="drawer-plus"
                          onClick={() => change(line.variantId, qty + 1, info)}
                          className={stepButton}
                        >
                          <Plus aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <p data-testid="drawer-line-total" className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
                        <span className="text-base font-bold text-fg">{formatEuros(info.priceCents * qty)}</span>
                        {discounted && info.compareAtCents !== null ? (
                          <del data-testid="drawer-line-before" className="text-sm text-fg-muted line-through">
                            {formatEuros(info.compareAtCents * qty)}
                          </del>
                        ) : null}
                      </p>
                    </>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    aria-label={`Quitar ${name} del carrito`}
                    data-testid="drawer-remove"
                    onClick={() => remove(line.variantId, info?.productName ?? 'El artículo')}
                    className={textButton}
                  >
                    Quitar
                  </button>
                </div>

                <div aria-live="polite" className="text-sm font-medium text-fg">
                  {notice?.variantId === line.variantId ? <p className="mt-2">{notice.text}</p> : null}
                  {state === 'ok' && info && qty < line.qty && notice?.variantId !== line.variantId ? (
                    <p className="mt-2">Hemos ajustado la cantidad al stock disponible ({info.stock}).</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <CompleteLook
          cartSlugs={lines.flatMap((line) => (line.info ? [line.info.slug] : []))}
          onAdd={add}
          onNavigate={closeCart}
        />
      </div>

      <div data-testid="cart-drawer-footer" className="max-h-3/5 shrink-0 space-y-3 overflow-y-auto border-t border-border bg-surface px-5 py-4">
        {savingsCents > 0 ? (
          <p data-testid="drawer-savings" className="text-sm font-medium text-success">
            Ahorras {formatEuros(savingsCents)} en esta compra
          </p>
        ) : null}
        <p aria-live="polite" data-testid="drawer-free-shipping" className="text-sm text-fg-muted">
          {totals.subtotalCents === 0
            ? ''
            : totals.missingForFreeCents > 0
              ? `Te faltan ${formatEuros(totals.missingForFreeCents)} para el envío gratis.`
              : 'Tu pedido tiene envío gratis.'}
        </p>
        <CartCoupon signedIn={isAccount} coupon={coupon} onChange={setCoupon} />
        {coupon && discounted ? (
          <p data-testid="drawer-discount" className="flex items-baseline justify-between gap-4 text-sm font-medium text-success">
            <span>Descuento ({coupon.code})</span>
            <span>−{formatEuros(discounted.discountCents)}</span>
          </p>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base font-semibold text-fg">Total</span>
          <span data-testid="drawer-total" className="text-xl font-bold text-fg">
            {formatEuros(discounted ? discounted.totalCents : totals.totalCents)}
          </span>
        </div>
        <p className="text-xs text-fg-muted">IVA incluido. El envío está incluido en el total.</p>
        <PaymentIcons />
        {totals.subtotalCents > 0 ? (
          <Link
            href={isAccount ? '/checkout' : { pathname: '/acceso', query: { siguiente: '/checkout' } }}
            onClick={closeCart}
            data-testid="drawer-checkout"
            className={primaryButton}
          >
            Tramitar compra
          </Link>
        ) : null}
        <button type="button" data-testid="cart-drawer-continue" onClick={closeCart} className={secondaryButton}>
          Seguir comprando
        </button>
        <Link
          href="/carrito"
          onClick={closeCart}
          data-testid="drawer-view-cart"
          className="block text-center text-sm font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Ver carrito
        </Link>
      </div>
    </>
  );
}
