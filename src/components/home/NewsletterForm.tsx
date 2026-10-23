'use client';

import Link from 'next/link';
import { useActionState, useId } from 'react';
import { subscribeAction } from '@/app/actions/newsletter';
import { initialNewsletterState } from '@/lib/newsletter/state';
import { FormMessage, SubmitButton, TextField, useFormFocus } from '@/components/forms/fields';

/**
 * Formulario de la newsletter (RF-26, CA-100 y CA-101, T-060). Los mensajes de éxito y de error van dentro de una
 * región `aria-live="polite"` que existe desde el principio, para que los lectores de pantalla anuncien el cambio.
 * La casilla de consentimiento es obligatoria y empieza sin marcar.
 */
export function NewsletterForm({ className = 'mx-auto mt-6 w-full max-w-xl space-y-4 text-left' }: { readonly className?: string }) {
  const [state, action] = useActionState(subscribeAction, initialNewsletterState);
  const formRef = useFormFocus(state);
  const consentId = useId();
  const consentErrorId = `${consentId}-error`;
  const consentError = state.fieldErrors?.consent;

  return (
    <form ref={formRef} action={action} noValidate className={className}>
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        maxLength={254}
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />

      <div>
        <div className="flex items-start gap-3">
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? consentErrorId : undefined}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
          <label htmlFor={consentId} className="text-sm text-fg">
            He leído y acepto la{' '}
            <Link href="/privacidad" className="font-medium text-accent-text underline-offset-2 hover:underline">
              política de privacidad
            </Link>{' '}
            y quiero recibir novedades y ofertas por email.
          </label>
        </div>
        {consentError ? (
          <p id={consentErrorId} className="mt-1 text-sm font-medium text-danger">
            {consentError}
          </p>
        ) : null}
      </div>

      <div aria-live="polite" data-testid="newsletter-message">
        <FormMessage state={state} />
      </div>

      <SubmitButton pendingLabel="Suscribiendo…">Suscribirme</SubmitButton>
    </form>
  );
}
