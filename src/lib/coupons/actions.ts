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
import { describeCouponFailure } from './messages';
import type { CouponPreviewState } from './preview-state';
import { checkCouponForUser } from './store';

const previewInputSchema = z.object({ couponCode: z.string().trim().min(1, 'Escribe un código.').max(40) });

const GENERIC_ERROR = 'No hemos podido comprobar el código. Inténtalo de nuevo.';

/**
 * «Aplicar» en el pago (RF-27, CA-137): valida el código para el cliente con sesión y enseña el descuento y el total. Del
 * formulario solo se lee el texto del código; los importes salen del carrito de la cuenta y de la BD, nunca del navegador.
 */
export async function previewCouponAction(_previous: CouponPreviewState, formData: FormData): Promise<CouponPreviewState> {
  const parsed = previewInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Escribe un código.' };

  const { client, user } = await getCurrentUser();
  if (!user) return { status: 'error', message: 'Inicia sesión para usar un código de descuento.' };

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
    };
  } catch (error) {
    console.error('previewCouponAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error', message: GENERIC_ERROR };
  }
}
