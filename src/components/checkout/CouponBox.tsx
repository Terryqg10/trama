'use client';

import { useId, useState } from 'react';
import { formatEuros } from '@/lib/domain/shop';
import { useCheckoutCoupon } from './CheckoutCouponContext';

const inputClass =
  'block min-h-11 min-w-0 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-fg aria-[invalid=true]:border-danger';
const buttonClass =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-70';

/**
 * Campo «Código de descuento» del resumen del pago (RF-27, CA-137, T-094). «Aplicar» pide al servidor que compruebe el código
 * para este cliente y enseña el descuento; «Quitar código» lo descarta. Es un formulario con `onSubmit` y no una acción de
 * servidor a propósito: una acción reiniciaría el campo tras cada intento y borraría lo escrito. Fuera del formulario de pago,
 * para no anidar formularios; el pago recibe el código aplicado por un campo oculto.
 */
export function CouponBox() {
  const { state, applied, pending, apply, remove } = useCheckoutCoupon();
  const [value, setValue] = useState('');
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const hintId = `${inputId}-hint`;
  const error = state.status === 'error' ? state.message : undefined;
  const typedButNotApplied = value.trim() !== '' && applied === null && !pending && !error;

  if (applied) {
    return (
      <div data-testid="coupon-box">
        <div aria-live="polite" data-testid="coupon-message">
          <p data-testid="coupon-applied" className="text-sm font-medium text-success">
            Código <code className="whitespace-nowrap font-semibold">{applied.code}</code> aplicado: −{formatEuros(applied.discountCents)}.
          </p>
        </div>
        <button type="button" data-testid="coupon-remove" onClick={remove} className={`mt-2 ${buttonClass}`}>
          Quitar código
        </button>
      </div>
    );
  }

  return (
    <form
      data-testid="coupon-box"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() !== '' && !pending) apply(value);
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
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? messageId : null, typedButNotApplied ? hintId : null].filter(Boolean).join(' ') || undefined}
          data-testid="coupon-input"
          className={inputClass}
        />
        <button type="submit" disabled={pending} data-testid="coupon-apply" className={buttonClass}>
          {pending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      <div aria-live="polite" data-testid="coupon-message">
        {error ? (
          <p id={messageId} role="alert" className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
      {typedButNotApplied ? (
        <p id={hintId} data-testid="coupon-hint" className="mt-2 text-sm text-fg-muted">
          Pulsa «Aplicar» para usar este código.
        </p>
      ) : null}
    </form>
  );
}
