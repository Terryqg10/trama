import { Truck } from 'lucide-react';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  RETURN_WINDOW_DAYS,
  SHIPPING_FLAT_CENTS,
  formatEuros,
} from '@/lib/domain/shop';

/**
 * Franja de envío gratis de la portada (CA-117, T-072; rediseñada en CA-143, T-109). Sin foto, a todo el ancho y con tokens:
 * icono de camión, título en mayúsculas espaciadas y un subtítulo sutil. Todos los importes y plazos salen de `shop.ts`, no
 * se escriben a mano (el subtítulo no promete plazos de entrega ni devoluciones gratuitas: eso no está declarado en ninguna parte).
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
        Tarifa plana de {formatEuros(SHIPPING_FLAT_CENTS)} en el resto de pedidos. Devolución en {RETURN_WINDOW_DAYS} días.
      </p>
    </section>
  );
}
