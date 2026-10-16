import { RotateCcw, Truck } from 'lucide-react';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  RETURN_WINDOW_DAYS,
  SHIPPING_FLAT_CENTS,
  formatEuros,
} from '@/lib/domain/shop';

/** Bloque de envío y devolución (RF-16). Las condiciones se muestran completas. */
export function ShippingInfo() {
  return (
    <section
      aria-labelledby="envio-devolucion"
      className="rounded-container border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="envio-devolucion" className="text-lg font-semibold text-fg">
        Envío y devolución
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        <li className="flex items-start gap-3">
          <span className="rounded-control bg-accent-soft p-2 text-accent-text">
            <Truck aria-hidden="true" />
          </span>
          <p className="text-sm text-fg">
            <strong className="block font-semibold">Envío a domicilio</strong>
            {formatEuros(SHIPPING_FLAT_CENTS)} de tarifa plana. Gratis a partir de{' '}
            {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="rounded-control bg-accent-soft p-2 text-accent-text">
            <RotateCcw aria-hidden="true" />
          </span>
          <p className="text-sm text-fg">
            <strong className="block font-semibold">Devolución</strong>
            Tienes {RETURN_WINDOW_DAYS} días para devolver tu pedido.
          </p>
        </li>
      </ul>
      <p className="mt-4 text-sm text-fg-muted">
        Política de ejemplo: Trama es un proyecto de portfolio y no gestiona devoluciones reales.
      </p>
    </section>
  );
}
