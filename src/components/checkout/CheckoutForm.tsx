'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, SubmitButton, useFormFocus } from '@/components/forms/fields';
import { initialFormState } from '@/lib/auth/form-state';
import { startCheckoutAction } from '@/lib/checkout/actions';

export interface CheckoutAddress {
  readonly id: string;
  readonly recipientName: string;
  readonly line1: string;
  readonly line2: string | null;
  readonly postalCode: string;
  readonly city: string;
  readonly province: string;
}

/**
 * Elección de dirección y botón de pago (RF-06). Solo se envía el id de la dirección: el servidor
 * calcula todos los importes (CA-10). Las direcciones se gestionan en la cuenta.
 */
export function CheckoutForm({ addresses, disabled }: { readonly addresses: readonly CheckoutAddress[]; readonly disabled: boolean }) {
  const [state, action] = useActionState(startCheckoutAction, initialFormState);
  const formRef = useFormFocus(state);
  const error = state.fieldErrors?.['addressId'];

  if (addresses.length === 0) {
    return (
      <div className="rounded-container border border-border bg-surface p-6">
        <p className="font-semibold">Necesitas una dirección de envío</p>
        <p className="mt-1 text-sm text-fg-muted">Añádela en tu cuenta y vuelve aquí para pagar.</p>
        <Link
          href="/cuenta/direcciones/nueva"
          className="mt-4 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Añadir dirección
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} noValidate className="space-y-6">
      <FormMessage state={state} />
      <fieldset aria-describedby={error ? 'error-direccion' : undefined}>
        <legend className="text-lg font-semibold">Dirección de envío</legend>
        <div className="mt-3 space-y-3">
          {addresses.map((address, index) => (
            <label
              key={address.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-container border border-border bg-surface p-4 has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name="addressId"
                value={address.id}
                defaultChecked={index === 0}
                className="mt-1 size-5 accent-accent"
              />
              <span className="text-sm">
                <span className="block font-semibold">{address.recipientName}</span>
                <span className="block text-fg-muted">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                </span>
                <span className="block text-fg-muted">
                  {address.postalCode} {address.city}, {address.province}
                </span>
              </span>
            </label>
          ))}
        </div>
        {error ? (
          <p id="error-direccion" className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <Link
          href="/cuenta/direcciones/nueva"
          className="mt-3 inline-flex min-h-11 items-center rounded-control px-1 text-sm font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover"
        >
          Añadir otra dirección
        </Link>
      </fieldset>
      {disabled ? (
        <p className="text-sm text-fg-muted">Resuelve los avisos del carrito para poder pagar.</p>
      ) : (
        <SubmitButton pendingLabel="Preparando el pago…">Pagar con tarjeta</SubmitButton>
      )}
      <p className="text-sm text-fg-muted">
        Pagarás en la página segura de Stripe, en modo de prueba: no se cobra nada.
      </p>
    </form>
  );
}
