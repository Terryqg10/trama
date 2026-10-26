'use server';

import { fieldErrors, formDataToObject } from '@/lib/auth/schemas';
import { issueWelcomeCoupon } from '@/lib/coupons/store';
import { newsletterSchema } from '@/lib/newsletter/schema';
import type { CouponNotice, NewsletterState } from '@/lib/newsletter/state';
import { confirmHref, subscribeToNewsletter } from '@/lib/newsletter/subscribe';
import { createServiceClient } from '@/lib/supabase/service';

const SUCCESS_MESSAGE = '¡Gracias por suscribirte! Falta un paso: confirma tu suscripción para recibir novedades y ofertas.';
const SERVER_ERROR = 'No se ha podido completar la suscripción. Inténtalo de nuevo.';

/**
 * Cupón de bienvenida del email (RF-27, CA-135): un fallo aquí no puede hacer fracasar la suscripción, que ya está
 * guardada; simplemente no se muestra código.
 */
async function couponNoticeFor(email: string): Promise<CouponNotice | null> {
  try {
    const issued = await issueWelcomeCoupon(createServiceClient(), email);
    switch (issued.status) {
      case 'issued':
      case 'existing':
        return { status: issued.status, code: issued.code, expiresAt: issued.expiresAt };
      case 'expired':
      case 'redeemed':
        return { status: issued.status };
      case 'error':
        return null;
    }
  } catch (error) {
    console.error('subscribeAction: no se pudo preparar el cupón', error instanceof Error ? error.message : 'error desconocido');
    return null;
  }
}

/**
 * Acción del formulario de la newsletter (RF-26, CA-100, CA-103 y CA-104, T-059 y T-061). Valida con Zod, guarda la alta como
 * PENDIENTE y devuelve el estado para `useActionState`, con el enlace de confirmación (sin correo propio, en pantalla). Un email
 * nuevo, pendiente o ya confirmado responde igual. Con éxito, añade el cupón de bienvenida (RF-27). Si el campo trampa
 * (`website`) viene relleno, descarta la alta sin guardar nada y responde como si hubiera ido bien.
 */
export async function subscribeAction(_previous: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const raw = formDataToObject(formData);
  if ((raw.website ?? '').trim() !== '') return { status: 'success', message: SUCCESS_MESSAGE };
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

  const coupon = await couponNoticeFor(parsed.data.email);
  return { status: 'success', message: SUCCESS_MESSAGE, confirm: { href: confirmHref(result.token) }, ...(coupon ? { coupon } : {}) };
}
