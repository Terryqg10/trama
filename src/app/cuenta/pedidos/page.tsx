import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { PageContainer } from '@/components/PageContainer';
import { requireUser } from '@/lib/auth/session';
import { formatEuros } from '@/lib/domain/shop';
import { formatOrderDate, listOrders, orderNumber, type OrderSummary } from '@/lib/orders/orders';

export const metadata: Metadata = { title: 'Mis pedidos' };

export default async function PedidosPage() {
  const { client, user } = await requireUser();

  let orders: OrderSummary[] = [];
  let failed = false;
  try {
    orders = await listOrders(client, user.id);
  } catch (error) {
    console.error('PedidosPage: no se pudo cargar el historial', error instanceof Error ? error.message : 'error');
    failed = true;
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center rounded-control pr-3 text-sm font-medium text-accent-text hover:underline"
        >
          Volver a mi cuenta
        </Link>
        <h1 className="mt-2 text-display font-bold">Mis pedidos</h1>

        <div className="mt-8">
          {failed ? (
            <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
              No hemos podido cargar tus pedidos. Recarga la página para reintentarlo.
            </p>
          ) : orders.length === 0 ? (
            <EmptyState
              title="Aún no has hecho pedidos"
              description="Cuando compres, aquí verás su estado y su detalle."
              action={{ href: '/novedades', label: 'Ver novedades' }}
            />
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id} data-testid="order-row">
                  <Link
                    href={`/cuenta/pedidos/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-border bg-surface p-5 hover:bg-accent-soft"
                  >
                    <span>
                      <span className="block font-semibold">Pedido {orderNumber(order.id)}</span>
                      <span className="block text-sm text-fg-muted">{formatOrderDate(order.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      <OrderStatusBadge status={order.status} />
                      <span className="font-semibold">{formatEuros(order.totalCents)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
