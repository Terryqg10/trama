'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, useTransition } from 'react';
import { applyCartCouponAction } from '@/lib/coupons/actions';
import { initialCouponPreview } from '@/lib/coupons/preview-state';
import { clearStoredCoupon, writeStoredCoupon, type StoredCoupon } from '@/lib/coupons/stored-coupon';

const inputClass =
  'block min-h-11 min-w-0 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-fg aria-[invalid=true]:border-danger';
const buttonClass =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-70';

/**
 * Código de descuento del carrito lateral (CA-151 y CA-152, T-120, Enmienda 49): acordeón nativo (`<details>`) con el campo y
 * «Aplicar». Con sesión, el servidor valida el código (formato, existencia, caducidad, primera compra y el límite de 3
 * intentos por minuto) y devuelve el porcentaje; el descuento que se ve en el total lo calcula el carrito con él. Un invitado
 * solo ve cómo conseguirlo. «Aplicar» es un envío de formulario con `onSubmit` (no una acción de servidor) para no vaciar el
 * campo tras un error. El código aplicado queda en `sessionStorage` y el pago lo recoge y lo vuelve a validar.
 */
export function CartCoupon({
  signedIn,
  coupon,
  onChange,
}: {
  readonly signedIn: boolean;
  readonly coupon: StoredCoupon | null;
  readonly onChange: (coupon: StoredCoupon | null) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const messageId = `${inputId}-message`;

  function apply(): void {
    const code = value.trim();
    if (code === '' || pending) return;
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.set('couponCode', code);
      const result = await applyCartCouponAction(initialCouponPreview, data).catch(() => null);
      if (result?.status === 'applied' && result.code !== undefined && result.percentOff !== undefined) {
        const applied = { code: result.code, percentOff: result.percentOff };
        writeStoredCoupon(applied);
        onChange(applied);
        setValue('');
        return;
      }
      setError(result?.message ?? 'No hemos podido comprobar el código. Inténtalo de nuevo.');
    });
  }

  function remove(): void {
    clearStoredCoupon();
    setError(null);
    onChange(null);
  }

  return (
    <details data-testid="cart-coupon" className="group border-b border-border pb-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-control text-sm font-medium text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        ¿Tienes un código de descuento?
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>

      <div className="pt-1">
        {!signedIn ? (
          <p data-testid="coupon-guest" className="text-sm text-fg-muted">
            Inicia sesión para usar un código de descuento.{' '}
            <Link href="/acceso" className="font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover">
              Iniciar sesión
            </Link>
          </p>
        ) : coupon ? (
          <div data-testid="cart-coupon-applied">
            <p aria-live="polite" className="text-sm font-medium text-success">
              Código <code className="whitespace-nowrap font-semibold">{coupon.code}</code> aplicado.
            </p>
            <button type="button" data-testid="cart-coupon-remove" onClick={remove} className={`mt-2 ${buttonClass}`}>
              Quitar código
            </button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <label htmlFor={inputId} className="block text-sm font-medium text-fg">
              Código de descuento
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={inputId}
                name="couponCode"
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={20}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? messageId : undefined}
                data-testid="cart-coupon-input"
                className={inputClass}
              />
              <button type="submit" disabled={pending} data-testid="cart-coupon-apply" className={buttonClass}>
                {pending ? 'Aplicando…' : 'Aplicar'}
              </button>
            </div>
            <div aria-live="polite">
              {error ? (
                <p id={messageId} role="alert" data-testid="cart-coupon-error" className="mt-2 text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
