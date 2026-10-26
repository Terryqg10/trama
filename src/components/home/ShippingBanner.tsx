import { Truck } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/**
 * Franja de envío gratis de la portada (CA-117, T-072; rediseñada en CA-143, T-109). Sin foto, a todo el ancho y con tokens:
 * icono de camión, título en mayúsculas espaciadas y un subtítulo sutil. El importe sale de `shop.ts`. Sin palabras repetidas con
 * la sección de confianza que la sigue (CA-145, T-111): la tarifa, los días de devolución y las promesas de ejemplo se dicen solo allí.
 */
export function ShippingBanner() {
  return (
    <section
      aria-label="Envío gratis"
      data-testid="shipping-banner"
      className="flex w-full flex-col items-center justify-center gap-3 bg-surface px-(--layout-gutter) py-10 text-center"
    >
      <Truck aria-hidden="true" className="size-8 text-accent" />
      <p
        data-testid="shipping-banner-text"
        className="text-sm font-bold uppercase tracking-widest text-fg"
      >
        Envío gratis a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}
      </p>
      <p data-testid="shipping-banner-detail" className="text-xs text-fg-muted">
        Se aplica automáticamente al tramitar tu compra.
      </p>
    </section>
  );
}
