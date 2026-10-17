import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { requireAdmin } from '@/lib/auth/admin';
import { formatEuros } from '@/lib/domain/shop';
import { listAdminOrders, MAX_ADMIN_ORDERS, type AdminOrderSummary } from '@/lib/orders/admin';
import { formatOrderDate, orderNumber, ORDER_STATUSES, statusLabel, type OrderStatus } from '@/lib/orders/orders';
import { z } from 'zod';

export const metadata: Metadata = { title: 'Pedidos' };

const filterLink =
  'inline-flex min-h-11 items-center rounded-control border px-3 text-sm font-medium md:min-h-(--control-height)';

/** Filtra por número de pedido o por nombre del destinatario, sin distinguir mayúsculas. */
function matches(order: AdminOrderSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return orderNumber(order.id).toLowerCase().includes(needle) || order.recipientName.toLowerCase().includes(needle);
}

export default async function AdminPedidosPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { estado, q } = await searchParams;
  const { client } = await requireAdmin();

  const parsedStatus = z.enum(ORDER_STATUSES).safeParse(estado);
  const status: OrderStatus | undefined = parsedStatus.success ? parsedStatus.data : undefined;
  const query = typeof q === 'string' ? q.slice(0, 80) : '';

  let orders: AdminOrderSummary[] = [];
  let failed = false;
  try {
    orders = await listAdminOrders(client, status);
  } catch (error) {
    console.error('AdminPedidosPage: no se pudo cargar el listado', error instanceof Error ? error.message : 'error');
    failed = true;
  }
  const visible = orders.filter((order) => matches(order, query));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-display font-semibold">Pedidos</h1>
        <p className="text-sm text-fg-muted tabular">
          {visible.length} {visible.length === 1 ? 'pedido' : 'pedidos'}
          {orders.length >= MAX_ADMIN_ORDERS ? ` (se muestran los últimos ${MAX_ADMIN_ORDERS})` : ''}
        </p>
      </div>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: '/admin/pedidos', ...(query ? { query: { q: query } } : {}) }}
          aria-current={status ? undefined : 'true'}
          className={`${filterLink} ${status ? 'border-border-strong bg-surface text-fg hover:bg-accent-soft' : 'border-accent bg-accent-soft text-accent-text'}`}
        >
          Todos
        </Link>
        {ORDER_STATUSES.map((value) => (
          <Link
            key={value}
            href={{ pathname: '/admin/pedidos', query: { estado: value, ...(query ? { q: query } : {}) } }}
            aria-current={status === value ? 'true' : undefined}
            className={`${filterLink} ${status === value ? 'border-accent bg-accent-soft text-accent-text' : 'border-border-strong bg-surface text-fg hover:bg-accent-soft'}`}
          >
            {statusLabel(value)}
          </Link>
        ))}
      </nav>

      {failed ? (
        <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
          No hemos podido cargar los pedidos. Recarga la página para reintentarlo.
        </p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-container border border-border bg-surface px-6 py-12 text-center">
          <Inbox aria-hidden="true" className="size-6 text-fg-muted" />
          <p className="font-medium">{query || status ? 'Ningún pedido coincide con el filtro' : 'Sin pedidos'}</p>
          <p className="text-sm text-fg-muted">
            {query || status ? 'Prueba con otro estado o quita la búsqueda.' : 'Cuando haya compras, aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="overflow-clip rounded-container border border-border bg-surface">
          <div
            role="presentation"
            aria-hidden="true"
            data-testid="admin-table-header"
            className="sticky top-(--topbar-height) z-10 hidden grid-cols-12 gap-(--grid-gap) border-b border-border bg-surface-muted px-4 py-2 text-xs font-medium tracking-tight text-fg-muted md:grid"
          >
            <span className="col-span-3">Pedido</span>
            <span className="col-span-2">Fecha</span>
            <span className="col-span-3">Destinatario</span>
            <span className="col-span-2">Estado</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          <ul className="divide-y divide-border">
            {visible.map((order) => (
              <li
                key={order.id}
                data-testid="admin-order-row"
                className="relative grid min-h-(--row-height) grid-cols-2 items-center gap-x-(--grid-gap) gap-y-1 px-4 py-3 text-sm hover:bg-accent-soft md:grid-cols-12 md:py-2"
              >
                <span className="col-span-2 flex items-center justify-between md:col-span-3">
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="font-medium after:absolute after:inset-0 hover:underline"
                  >
                    {orderNumber(order.id)}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-4 text-fg-muted md:hidden" />
                </span>
                <span className="md:col-span-2">
                  <span className="text-fg-muted md:hidden">Fecha: </span>
                  {formatOrderDate(order.createdAt)}
                </span>
                <span className="md:col-span-3">
                  <span className="text-fg-muted md:hidden">Para: </span>
                  {order.recipientName || '—'}
                </span>
                <span className="md:col-span-2">
                  <AdminStatusBadge status={order.status} />
                </span>
                <span className="tabular text-right font-medium md:col-span-2">
                  <span className="mr-2 font-normal text-fg-muted md:hidden">Total</span>
                  {formatEuros(order.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
