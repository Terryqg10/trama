'use server';

import { fieldErrors, formDataToObject } from '@/lib/auth/schemas';
import type { FormState } from '@/lib/auth/form-state';
import { newsletterSchema } from '@/lib/newsletter/schema';
import { subscribeToNewsletter } from '@/lib/newsletter/subscribe';

const SUCCESS_MESSAGE = '¡Gracias por suscribirte! Te avisaremos de las novedades y ofertas.';
const SERVER_ERROR = 'No se ha podido completar la suscripción. Inténtalo de nuevo.';

/**
 * Acción del formulario de la newsletter (RF-26, CA-100, T-059). Valida con Zod, guarda y devuelve el estado para
 * `useActionState`. Un email ya suscrito responde igual que uno nuevo.
 */
export async function subscribeAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisa los datos marcados e inténtalo de nuevo.',
      fieldErrors: fieldErrors(parsed.error),
      values: { email: raw.email ?? '' },
    };
  }

  const result = await subscribeToNewsletter(parsed.data);
  if (!result.ok) return { status: 'error', message: SERVER_ERROR, values: { email: parsed.data.email } };
  return { status: 'success', message: SUCCESS_MESSAGE };
}
