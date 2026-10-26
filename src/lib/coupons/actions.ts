'use server';

import { z } from 'zod';
import { formDataToObject } from '@/lib/auth/schemas';
import { getCurrentUser } from '@/lib/auth/session';
import { loadAccountCart } from '@/lib/cart/account';
import { fetchCartLines } from '@/lib/cart/lines';
import { buildCheckoutSummary } from '@/lib/checkout/summary';
import { formatEuros } from '@/lib/domain/shop';
import { createServiceClient } from '@/lib/supabase/service';
import { withDiscount } from './amounts';
import { couponAttemptLimiter } from './limiter';
import { describeCouponFailure } from './messages';
import type { CouponPreviewState } from './preview-state';
import { checkCouponForUser } from './store';

/** Lo único que se lee del navegador (I5): el texto del código, en mayúsculas y de 1 a 20 caracteres (el real mide 15). */
const previewInputSchema = z.object({
  couponCode: z.string().trim().toUpperCase().min(1, 'Escribe un código.').max(20, 'Ese código no es válido.'),
});

const GENERIC_ERROR = 'No hemos podido comprobar el código. Inténtalo de nuevo.';

/**
 * Comprobación de un código para el cliente con sesión (RF-27, CA-137, CA-151, CA-152): enseña el descuento y el total. Del
 * formulario solo se lee el texto del código; los importes salen del carrito de la cuenta y de la BD, nunca del navegador. Con
 * `limited`, cada intento (acierte o falle) cuenta para el límite de 3 por minuto y cuenta; al superarlo no se consulta la BD.
 */
async function previewCoupon(formData: FormData, limited: boolean): Promise<CouponPreviewState> {
  const parsed = previewInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Escribe un código.' };

  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'error', message: 'Inicia sesión para usar un código de descuento.' };

  const attempt = limited ? couponAttemptLimiter.check(`coupon:${user.id}`) : { allowed: true as const };
  if (!attempt.allowed) {
    const seconds = Math.max(Math.ceil(attempt.retryAfterMs / 1000), 1);
    return { status: 'error', message: `Demasiados intentos. Espera ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}.` };
  }

  try {
    const cart = await loadAccountCart(client);
    const infos = await fetchCartLines(
      cart.map((line) => line.variantId),
      client,
    );
    const summary = buildCheckoutSummary(cart, infos);
    if (summary.lines.length === 0 || summary.issues.length > 0) {
      return { status: 'error', message: 'Revisa tu carrito antes de aplicar un código.' };
    }

    const check = await checkCouponForUser(createServiceClient(), user.id, parsed.data.couponCode);
    if (!check.ok) return { status: 'error', message: describeCouponFailure(check.reason) };

    const totals = withDiscount(summary.totals, check.coupon.percentOff);
    return {
      status: 'applied',
      message: `Código aplicado: −${formatEuros(totals.discountCents)}.`,
      code: check.coupon.code,
      discountCents: totals.discountCents,
      totalCents: totals.totalCents,
      percentOff: check.coupon.percentOff,
    };
  } catch (error) {
    console.error('previewCouponAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error', message: GENERIC_ERROR };
  }
}

/** «Aplicar» en el pago (RF-27, CA-137): sin límite de intentos propio (ver la nota de la Enmienda 49). */
export async function previewCouponAction(_previous: CouponPreviewState, formData: FormData): Promise<CouponPreviewState> {
  return previewCoupon(formData, false);
}

/** «Aplicar» en el carrito lateral (CA-151, CA-152): la misma comprobación con el límite de 3 intentos por minuto y cuenta. */
export async function applyCartCouponAction(_previous: CouponPreviewState, formData: FormData): Promise<CouponPreviewState> {
  return previewCoupon(formData, true);
}
