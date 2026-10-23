import type { CartTotals } from '@/lib/cart/cart';

/**
 * Importes con el cupón de bienvenida (RF-27, CA-138, T-093, Enmienda 41). El descuento es el porcentaje del SUBTOTAL
 * (sin envío), redondeado hacia abajo al céntimo. El envío gratis se decide con el subtotal ANTES del descuento: usar un
 * cupón no puede hacer que un pedido pierda el envío gratis. Total = subtotal − descuento + envío.
 */

export interface DiscountedTotals extends CartTotals {
  readonly discountCents: number;
}

export function discountFor(subtotalCents: number, percentOff: number): number {
  const raw = Math.floor((subtotalCents * percentOff) / 100);
  return Math.min(Math.max(raw, 0), Math.max(subtotalCents, 0));
}

export function withDiscount(totals: CartTotals, percentOff: number): DiscountedTotals {
  const discountCents = discountFor(totals.subtotalCents, percentOff);
  return {
    ...totals,
    discountCents,
    totalCents: totals.subtotalCents - discountCents + totals.shippingCents,
  };
}
