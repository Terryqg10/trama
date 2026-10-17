import type { OrderStatus } from '@/lib/orders/orders';
import { statusLabel } from '@/lib/orders/orders';

const TONE: Readonly<Record<OrderStatus, string>> = {
  pendiente: 'border-border-strong text-fg',
  pagado: 'border-success text-success',
  preparado: 'border-success text-success',
  enviado: 'border-success text-success',
  entregado: 'border-success text-success',
  cancelado: 'border-danger text-danger',
};

/** Estado del pedido: siempre con texto, el color solo refuerza (WCAG AA). */
export function OrderStatusBadge({ status }: { readonly status: OrderStatus }) {
  return (
    <span
      data-testid="order-status"
      className={`inline-flex min-h-8 items-center rounded-control border bg-surface px-3 text-sm font-semibold ${TONE[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
