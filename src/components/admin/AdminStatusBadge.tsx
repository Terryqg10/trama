import { CircleCheck, CircleX, Clock, Package, PackageCheck, Truck, type LucideIcon } from 'lucide-react';
import { statusLabel, type OrderStatus } from '@/lib/orders/orders';

const ICON: Readonly<Record<OrderStatus, LucideIcon>> = {
  pendiente: Clock,
  pagado: CircleCheck,
  preparado: Package,
  enviado: Truck,
  entregado: PackageCheck,
  cancelado: CircleX,
};

const TONE: Readonly<Record<OrderStatus, string>> = {
  pendiente: 'border-border-strong text-fg',
  pagado: 'border-success text-success',
  preparado: 'border-success text-success',
  enviado: 'border-success text-success',
  entregado: 'border-success text-success',
  cancelado: 'border-danger text-danger',
};

/** Estado del pedido en el panel (v4): siempre icono y texto; el color solo refuerza (CA-S13). */
export function AdminStatusBadge({ status }: { readonly status: OrderStatus }) {
  const Icon = ICON[status];
  return (
    <span
      data-testid="order-status"
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-tile border bg-surface px-2 text-xs font-medium ${TONE[status]}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {statusLabel(status)}
    </span>
  );
}
