import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/** Banner de envío gratis de la portada (CA-84, T-048). El umbral sale de `shop.ts`, no se escribe a mano. */
export function ShippingBanner() {
  return (
    <section aria-label="Envío gratis" data-testid="shipping-banner" className="bg-surface-muted px-4 py-6 text-center">
      <p className="text-base font-semibold text-fg sm:text-lg">
        Envío gratis en pedidos superiores a {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}
      </p>
    </section>
  );
}
