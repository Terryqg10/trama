'use client';

import { formatEuros } from '@/lib/domain/shop';
import { useCheckoutCoupon } from './CheckoutCouponContext';

/**
 * Importes del resumen del pago (RF-06, RF-27, T-094). Con un código aplicado añade la línea «Descuento» y enseña el total que ha
 * calculado el servidor; sin él, los importes del pedido tal cual. El total que se cobra lo vuelve a calcular el servidor al pagar.
 */
export function CheckoutTotals({
  subtotalCents,
  shippingCents,
  totalCents,
}: {
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
}) {
  const { applied } = useCheckoutCoupon();
  return (
    <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-fg-muted">Subtotal</dt>
        <dd data-testid="checkout-subtotal" className="font-medium">
          {formatEuros(subtotalCents)}
        </dd>
      </div>
      {applied ? (
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Descuento</dt>
          <dd data-testid="checkout-discount" className="font-medium text-success">
            −{formatEuros(applied.discountCents)}
          </dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4">
        <dt className="text-fg-muted">Envío</dt>
        <dd data-testid="checkout-shipping" className="font-medium">
          {shippingCents === 0 ? 'Gratis' : formatEuros(shippingCents)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
        <dt className="font-semibold">Total</dt>
        <dd data-testid="checkout-total" className="font-bold">
          {formatEuros(applied?.totalCents ?? totalCents)}
        </dd>
      </div>
    </dl>
  );
}
