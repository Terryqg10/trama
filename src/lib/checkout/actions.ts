'use server';

import { redirect } from 'next/navigation';
import { formDataToObject } from '@/lib/auth/schemas';
import { getCurrentUser } from '@/lib/auth/session';
import type { FormState } from '@/lib/auth/form-state';
import { requestOrigin } from '@/lib/http/origin';
import { createStripeClient } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/service';
import { checkoutInputSchema, createCheckout } from './create-checkout';
import { describeIssue } from './summary';

/**
 * Inicia el pago (RF-06): crea el pedido, reserva el stock y abre la sesión de Stripe. Del formulario
 * solo se lee `addressId`; cualquier otro dato se descarta (CA-10).
 */
export async function startCheckoutAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = checkoutInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: { addressId: 'Elige una dirección de envío.' },
      message: 'Elige una dirección de envío para continuar.',
    };
  }

  const { client, user } = await getCurrentUser();
  if (!user) redirect('/acceso?siguiente=/checkout');

  let result: Awaited<ReturnType<typeof createCheckout>>;
  try {
    result = await createCheckout(
      { userClient: client, serviceClient: createServiceClient(), stripe: createStripeClient() },
      { userId: user.id, email: user.email ?? null, addressId: parsed.data.addressId, origin: await requestOrigin() },
    );
  } catch (error) {
    console.error('startCheckoutAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error', message: 'No hemos podido iniciar el pago. Inténtalo de nuevo.' };
  }

  switch (result.status) {
    case 'redirect':
      redirect(result.url);
    case 'empty':
      redirect('/carrito');
    case 'invalidAddress':
      return {
        status: 'error',
        fieldErrors: { addressId: 'Esa dirección no es válida. Elige otra.' },
        message: 'Esa dirección no es válida. Elige otra.',
      };
    case 'blocked':
      return { status: 'error', message: result.issues.map(describeIssue).join(' ') };
    case 'error':
      return { status: 'error', message: 'No hemos podido iniciar el pago. Inténtalo de nuevo.' };
  }
}
