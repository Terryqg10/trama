import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { requireUser } from '@/lib/auth/session';
import { capitalize } from '@/lib/catalog/facets';
import { formatEuros } from '@/lib/domain/shop';
import { formatOrderDate, getOrder, orderNumber, statusHint } from '@/lib/orders/orders';

export const metadata: Metadata = { title: 'Detalle del pedido' };

export default async function PedidoDetallePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { client, user } = await requireUser();

  // Un pedido ajeno o inexistente da 404: no se revela si el id existe (CA-14).
  const order = await getOrder(client, user.id, id);
  if (!order) notFound();

  const subtotalCents = order.totalCents - order.shippingCents;
  const { address } = order;

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/cuenta/pedidos"
          className="inline-flex min-h-11 items-center rounded-control pr-3 text-sm font-medium text-accent-text hover:underline"
        >
          Volver a mis pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-display font-bold">Pedido {orderNumber(order.id)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-fg-muted">
          {formatOrderDate(order.createdAt)} · {statusHint(order.status)}
        </p>

        <section aria-labelledby="titulo-lineas" className="mt-8">
          <h2 id="titulo-lineas" className="text-xl font-semibold">
            Artículos
          </h2>
          <ul className="mt-4 divide-y divide-border rounded-container border border-border bg-surface">
            {order.items.map((item) => (
              <li key={`${item.variantId}-${item.size}-${item.color}`} className="flex justify-between gap-4 p-4 text-sm">
                <span>
                  <span className="block font-semibold">
                    {item.qty} × {item.productName}
                  </span>
                  <span className="block text-fg-muted">
                    Talla {item.size} · {capitalize(item.color)} · {formatEuros(item.unitPriceCents)} por unidad
                  </span>
                </span>
                <span className="font-semibold">{formatEuros(item.unitPriceCents * item.qty)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-importes" className="mt-8">
          <h2 id="titulo-importes" className="text-xl font-semibold">
            Importes
          </h2>
          <dl className="mt-4 space-y-2 rounded-container border border-border bg-surface p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">Subtotal</dt>
              <dd className="font-medium">{formatEuros(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">Envío</dt>
              <dd className="font-medium">{order.shippingCents === 0 ? 'Gratis' : formatEuros(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold" data-testid="order-total">
                {formatEuros(order.totalCents)}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="titulo-envio" className="mt-8">
          <h2 id="titulo-envio" className="text-xl font-semibold">
            Dirección de envío
          </h2>
          <div className="mt-4 rounded-container border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">{address.recipient_name ?? ''}</p>
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
  );
}
