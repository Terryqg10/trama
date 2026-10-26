'use client';

import Link from 'next/link';
import { useActionState, useId } from 'react';
import { subscribeAction } from '@/app/actions/newsletter';
import { initialNewsletterState } from '@/lib/newsletter/state';
import { FormMessage, SubmitButton, TextField, useFormFocus } from '@/components/forms/fields';
import { DemoNotice } from '@/components/DemoNotice';
import { WelcomeCoupon } from './WelcomeCoupon';

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
    <form ref={formRef} action={action} noValidate className={`relative ${className}`}>
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

      {/* Campo trampa (CA-104): una persona no lo ve ni lo alcanza (`inert`: sin foco, sin lector de pantalla); un bot que rellena todo, sí. */}
      <div inert aria-hidden="true" data-testid="newsletter-honeypot" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
        <label>
          No rellenes este campo
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div aria-live="polite" data-testid="newsletter-message">
        <FormMessage state={state} />
        {state.status === 'success' && state.confirm ? (
          <div className="mt-3">
            <DemoNotice testId="newsletter-confirm" title="Confirma tu suscripción">
              <span className="block">
                Sin correo propio, el enlace de confirmación se muestra aquí. Con un proveedor de correo real te llegaría a tu
                email. Caduca en 24 horas.
              </span>
              <Link
                href={state.confirm.href}
                data-testid="newsletter-confirm-link"
                className="mt-3 inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Confirmar mi suscripción
              </Link>
            </DemoNotice>
          </div>
        ) : null}
        {state.status === 'success' && state.coupon ? (
          <div className="mt-3">
            <WelcomeCoupon notice={state.coupon} />
          </div>
        ) : null}
      </div>

      <SubmitButton pendingLabel="Suscribiendo…">Suscribirme</SubmitButton>
    </form>
  );
}
