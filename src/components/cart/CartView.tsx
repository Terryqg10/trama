'use client';

import Image from 'next/image';
import Link from 'next/link';
import { isPhotoPath } from '@/lib/catalog/image-path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { getCartLinesAction, saveAccountCartAction } from '@/lib/cart/actions';
import { maxQty, removeLine, setLineQty, summarize, type SavedCart } from '@/lib/cart/cart';
import type { CartLineInfo } from '@/lib/cart/lines';
import { useHydrated, useSavedCart, writeCart } from '@/lib/cart/store';
import { useGuestCartMerge } from '@/lib/cart/use-guest-merge';
import { capitalize } from '@/lib/catalog/facets';
import { formatEuros } from '@/lib/domain/shop';
import { EmptyState } from '../EmptyState';

interface Loaded {
  /** Variantes por las que se preguntó al servidor (estén o no en el resultado). */
  readonly requested: ReadonlySet<string>;
  readonly lines: ReadonlyMap<string, CartLineInfo>;
  readonly failed: boolean;
}

interface Notice {
  /** Línea a la que se refiere el aviso; `null` si es del carrito entero. */
  readonly variantId: string | null;
  readonly text: string;
}

const stepButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border-strong bg-surface text-fg hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-fg-muted';
const textButton =
  'inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover';

/**
 * Carrito de invitado (RF-03, RF-15). Las líneas guardadas en el navegador solo llevan `variantId` y
 * cantidad; el precio, el stock y los datos de la prenda se piden al servidor. Una variante que el
 * servidor no devuelve se muestra como «no disponible» y no cuenta en los totales (CA-62). Una
 * cantidad por encima del stock se limita y se avisa (CA-05).
 *
 * Con sesión (`initialAccountCart` definido), el carrito vive en la cuenta (CA-63): los cambios se
 * aplican al momento y se guardan en el servidor en orden; al llegar, las líneas del navegador se
 * fusionan con las de la cuenta (CA-04).
 */
export function CartView({ initialAccountCart }: { readonly initialAccountCart?: SavedCart }) {
  const hydrated = useHydrated();
  const guestCart = useSavedCart();
  const isAccount = initialAccountCart !== undefined;
  const [accountCart, setAccountCart] = useState<SavedCart>(initialAccountCart ?? []);
  const saved = isAccount ? accountCart : guestCart;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Guardado en la cuenta: en serie y solo se aplica la respuesta de la última petición.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(0);
  const persist = useCallback((next: SavedCart, previous: SavedCart) => {
    setAccountCart(next);
    const ticket = ++latest.current;
    queue.current = queue.current.then(async () => {
      const result = await saveAccountCartAction(next).catch(() => ({ status: 'error' as const }));
      if (ticket !== latest.current) return;
      if (result.status === 'ok') setAccountCart(result.cart);
      else {
        setAccountCart(previous);
        setNotice({ variantId: null, text: 'No hemos podido guardar el cambio. Inténtalo de nuevo.' });
      }
    });
  }, []);

  useGuestCartMerge(isAccount, setAccountCart);

  const ids = saved.map((line) => line.variantId);
  // Solo se vuelve a preguntar al servidor si hay variantes que aún no se han pedido.
  const pendingKey = ids.filter((id) => !loaded?.requested.has(id)).join(',');
  const allKey = ids.join(',');

  useEffect(() => {
    if (pendingKey === '') return;
    const requestedIds = allKey.split(',');
    let cancelled = false;
    void getCartLinesAction(requestedIds).then((result) => {
      if (cancelled) return;
      setLoaded({
        requested: new Set(requestedIds),
        lines: new Map(result.status === 'ok' ? result.lines.map((line) => [line.variantId, line]) : []),
        failed: result.status === 'error',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pendingKey, allKey]);

  if (!hydrated) {
    return <p className="text-fg-muted">Cargando carrito…</p>;
  }

  if (saved.length === 0) {
    return (
      <>
        <div aria-live="polite" className="sr-only">
          {notice?.variantId === null ? notice.text : ''}
        </div>
        <EmptyState
          title="Tu carrito está vacío"
          description="Añade prendas desde el catálogo para verlas aquí."
          action={{ href: '/novedades', label: 'Ver novedades' }}
        />
      </>
    );
  }

  if (pendingKey !== '' && !loaded?.failed) {
    return <p className="text-fg-muted">Cargando carrito…</p>;
  }

  if (loaded?.failed) {
    return (
      <div className="rounded-container border border-border bg-surface p-8 text-center">
        <p role="alert" className="text-lg font-semibold text-danger">
          No hemos podido cargar tu carrito.
        </p>
        <p className="mt-2 text-fg-muted">Tus prendas siguen guardadas. Inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={() => setLoaded(null)}
          className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const lines = saved.map((line) => {
    const info = loaded?.lines.get(line.variantId) ?? null;
    if (info === null) return { saved: line, info, state: 'missing' as const, qty: 0 };
    if (info.stock === 0) return { saved: line, info, state: 'soldOut' as const, qty: 0 };
    return { saved: line, info, state: 'ok' as const, qty: Math.min(line.qty, maxQty(info.stock)) };
  });
  const totals = summarize(
    lines.flatMap((line) => (line.state === 'ok' && line.info ? [{ priceCents: line.info.priceCents, qty: line.qty }] : [])),
  );

  function apply(next: SavedCart) {
    if (isAccount) persist(next, saved);
    else writeCart(next);
  }

  function change(variantId: string, requested: number, info: CartLineInfo) {
    const result = setLineQty(saved, variantId, requested, info.stock);
    apply(result.cart);
    setNotice(
      result.capped
        ? {
            variantId,
            text: `Solo quedan ${info.stock} unidades de ${info.productName} en talla ${info.size}.`,
          }
        : null,
    );
  }

  function remove(variantId: string, name: string) {
    apply(removeLine(saved, variantId));
    setNotice({ variantId: null, text: `${name} se ha quitado del carrito.` });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
      <div className="lg:col-span-2">
        <div aria-live="polite" className="sr-only">
          {notice?.variantId === null ? notice.text : ''}
        </div>
        <ul className="space-y-4">
          {lines.map(({ saved: line, info, state, qty }) => {
            const name = info ? `${info.productName}, talla ${info.size}, color ${info.color}` : 'Artículo';
            return (
              <li
                key={line.variantId}
                data-testid="cart-line"
                data-state={state}
                className="rounded-container border border-border bg-surface p-4 sm:p-6"
              >
                {info ? (
                  <div className="flex gap-4">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-control border border-border bg-surface-muted sm:size-28">
                      {info.image ? (
                        <Image
                          src={info.image.path}
                          alt={info.image.alt}
                          width={224}
                          height={224}
                          unoptimized
                          className={
                            isPhotoPath(info.image.path) ? 'h-full w-full object-cover object-top' : 'h-full w-full object-contain p-2'
                          }
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={{
                          pathname: `/producto/${info.slug}`,
                          query: { color: info.color, talla: info.size },
                        }}
                        className="font-semibold text-fg hover:underline"
                      >
                        {info.productName}
                      </Link>
                      <p className="mt-1 text-sm text-fg-muted">
                        Talla {info.size} · {capitalize(info.color)}
                      </p>
                      <p className="mt-1 text-sm text-fg-muted">{formatEuros(info.priceCents)} por unidad</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-fg">Este artículo ya no está disponible.</p>
                )}

                {state === 'missing' ? (
                  <p className="mt-2 text-sm text-fg-muted">
                    No cuenta en el total. Quítalo para seguir.
                  </p>
                ) : null}
                {state === 'soldOut' ? (
                  <p className="mt-2 text-sm font-medium text-danger">
                    Agotado. No cuenta en el total.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {state === 'ok' && info ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Quitar una unidad de ${name}`}
                          onClick={() => change(line.variantId, qty - 1, info)}
                          className={stepButton}
                        >
                          <Minus aria-hidden="true" className="size-4" />
                        </button>
                        <span
                          data-testid="cart-qty"
                          aria-label={`Cantidad de ${name}`}
                          className="min-w-10 text-center text-base font-semibold"
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Añadir una unidad de ${name}`}
                          onClick={() => change(line.variantId, qty + 1, info)}
                          className={stepButton}
                        >
                          <Plus aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <p className="font-semibold" data-testid="cart-line-total">
                        {formatEuros(info.priceCents * qty)}
                      </p>
                    </>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    aria-label={`Quitar ${name} del carrito`}
                    onClick={() => remove(line.variantId, info?.productName ?? 'El artículo')}
                    className={textButton}
                  >
                    Quitar
                  </button>
                </div>

                <div aria-live="polite" className="text-sm font-medium text-fg">
                  {notice?.variantId === line.variantId ? <p className="mt-2">{notice.text}</p> : null}
                  {state === 'ok' && info && qty < line.qty && notice?.variantId !== line.variantId ? (
                    <p className="mt-2">
                      Hemos ajustado la cantidad al stock disponible ({info.stock}).
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <section
        aria-labelledby="resumen-carrito"
        className="rounded-container border border-border bg-surface p-6 lg:sticky lg:top-6"
      >
        <h2 id="resumen-carrito" className="text-lg font-semibold">
          Resumen
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">Subtotal</dt>
            <dd data-testid="cart-subtotal" className="font-medium">
              {formatEuros(totals.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">Envío</dt>
            <dd data-testid="cart-shipping" className="font-medium">
              {totals.subtotalCents === 0
                ? '—'
                : totals.shippingCents === 0
                  ? 'Gratis'
                  : formatEuros(totals.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd data-testid="cart-total" className="font-bold">
              {formatEuros(totals.totalCents)}
            </dd>
          </div>
        </dl>
        <p aria-live="polite" data-testid="cart-free-shipping" className="mt-4 text-sm text-fg-muted">
          {totals.subtotalCents === 0
            ? ''
            : totals.missingForFreeCents > 0
              ? `Te faltan ${formatEuros(totals.missingForFreeCents)} para el envío gratis.`
              : 'Tu pedido tiene envío gratis.'}
        </p>
        {totals.subtotalCents > 0 ? (
          <Link
            href={isAccount ? '/checkout' : { pathname: '/acceso', query: { siguiente: '/checkout' } }}
            data-testid="cart-checkout"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-fg hover:bg-accent-hover"
          >
            {isAccount ? 'Finalizar compra' : 'Inicia sesión para finalizar'}
          </Link>
        ) : null}
        <p className="mt-4 text-sm text-fg-muted">IVA incluido.</p>
      </section>
    </div>
  );
}
