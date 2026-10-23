import { z } from 'zod';
import { requiredString } from '@/lib/zod-helpers';

/**
 * Esquema de entrada de la suscripción a la newsletter (RF-26, CA-100). Se valida siempre en el servidor, antes de
 * llegar a Supabase. El tipo se deriva con `z.infer`.
 */

const REQUIRED = 'Este campo es obligatorio.';
const CONSENT_REQUIRED = 'Debes aceptar la política de privacidad para suscribirte.';

export const newsletterSchema = z.object({
  email: requiredString(REQUIRED)
    .trim()
    .toLowerCase()
    .min(1, REQUIRED)
    .max(254, 'El email es demasiado largo.')
    .email('Introduce un email válido.'),
  // Una casilla marcada llega como «on» (o «true»); sin marcar no llega. El consentimiento es expreso: solo `true`.
  consent: z
    .union([z.literal('on'), z.literal('true'), z.literal(true)], { error: CONSENT_REQUIRED })
    .transform(() => true as const),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
