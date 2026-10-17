import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { requireAdmin } from '@/lib/auth/admin';
import { capitalize } from '@/lib/catalog/facets';
import { formatEuros } from '@/lib/domain/shop';
import { formatOrderDate, getOrder, orderNumber } from '@/lib/orders/orders';
import { adminNextStatuses } from '@/lib/orders/transitions';

export const metadata: Metadata = { title: 'Detalle del pedido' };

/** Detalle de un pedido para el admin. `getOrder` sin filtrar por cliente: la RLS deja ver todos al admin. */
export default async function AdminPedidoPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client } = await requireAdmin();

  const order = await getOrder(client, null, id);
  if (!order) notFound();

  const subtotalCents = order.totalCents - order.shippingCents;
  const { address } = order;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/pedidos"
        className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 text-sm font-medium text-accent-text hover:underline md:min-h-(--control-height)"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a pedidos
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-display font-semibold">Pedido {orderNumber(order.id)}</h1>
        <AdminStatusBadge status={order.status} />
      </div>
      <p className="-mt-3 text-sm text-fg-muted">
        {formatOrderDate(order.createdAt)}
      </p>

      <section aria-labelledby="titulo-acciones" className="rounded-container border border-border bg-surface p-4">
        <h2 id="titulo-acciones" className="text-lg font-semibold">
          Cambiar estado
        </h2>
        <div className="mt-3">
          <OrderStatusForm orderId={order.id} next={adminNextStatuses(order.status)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <section aria-labelledby="titulo-lineas" className="overflow-hidden rounded-container border border-border bg-surface lg:col-span-2">
          <h2 id="titulo-lineas" className="border-b border-border px-4 py-3 text-lg font-semibold">
            Artículos
          </h2>
          <div
            role="presentation"
            aria-hidden="true"
            className="hidden grid-cols-12 gap-(--grid-gap) border-b border-border bg-surface-muted px-4 py-2 text-xs font-medium tracking-tight text-fg-muted md:grid"
          >
            <span className="col-span-6">Artículo</span>
            <span className="col-span-2 text-right">Cantidad</span>
            <span className="col-span-2 text-right">Precio</span>
            <span className="col-span-2 text-right">Importe</span>
          </div>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={`${item.variantId}-${item.size}-${item.color}`}
                className="grid min-h-(--row-height) grid-cols-2 items-center gap-x-(--grid-gap) gap-y-1 px-4 py-3 text-sm md:grid-cols-12 md:py-2"
              >
                <span className="col-span-2 md:col-span-6">
                  <span className="block font-medium">{item.productName}</span>
                  <span className="block text-fg-muted">
                    Talla {item.size} · {capitalize(item.color)}
                  </span>
                </span>
                <span className="tabular md:col-span-2 md:text-right">
                  <span className="text-fg-muted md:hidden">Cantidad: </span>
                  {item.qty}
                </span>
                <span className="tabular text-right md:col-span-2">
                  <span className="mr-2 text-fg-muted md:hidden">Precio</span>
                  {formatEuros(item.unitPriceCents)}
                </span>
                <span className="tabular col-span-2 text-right font-medium md:col-span-2">
                  <span className="mr-2 font-normal text-fg-muted md:hidden">Importe</span>
                  {formatEuros(item.unitPriceCents * item.qty)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="titulo-importes" className="rounded-container border border-border bg-surface p-4">
            <h2 id="titulo-importes" className="text-lg font-semibold">
              Importes
            </h2>
            <dl className="tabular mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="font-medium">{formatEuros(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">Envío</dt>
                <dd className="font-medium">{order.shippingCents === 0 ? 'Gratis' : formatEuros(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold" data-testid="order-total">
                  {formatEuros(order.totalCents)}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="titulo-envio" className="rounded-container border border-border bg-surface p-4">
            <h2 id="titulo-envio" className="text-lg font-semibold">
              Dirección de envío
            </h2>
            <div className="mt-3 space-y-0.5 text-sm">
              <p className="font-medium">{address.recipient_name ?? ''}</p>
              <p className="text-fg-muted">
                {address.line1 ?? ''}
                {address.line2 ? `, ${address.line2}` : ''}
              </p>
              <p className="text-fg-muted">
                {address.postal_code ?? ''} {address.city ?? ''}, {address.province ?? ''}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
