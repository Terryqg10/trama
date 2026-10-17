import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { requireAdmin } from '@/lib/auth/admin';
import { ORDER_STATUSES, statusLabel, type OrderStatus } from '@/lib/orders/orders';

export const metadata: Metadata = { title: 'Resumen' };

async function countByStatus(
  client: Awaited<ReturnType<typeof requireAdmin>>['client'],
): Promise<Record<OrderStatus, number> | null> {
  const results = await Promise.all(
    ORDER_STATUSES.map(async (status) => {
      const { count, error } = await client
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return error ? null : ([status, count ?? 0] as const);
    }),
  );
  const counts: Record<OrderStatus, number> = {
    pendiente: 0,
    pagado: 0,
    preparado: 0,
    enviado: 0,
    entregado: 0,
    cancelado: 0,
  };
  for (const entry of results) {
    if (entry === null) return null;
    counts[entry[0]] = entry[1];
  }
  return counts;
}

export default async function AdminResumenPage() {
  const { client } = await requireAdmin();
  const counts = await countByStatus(client);

  return (
    <div className="space-y-4">
      <h1 className="text-display font-semibold">Resumen</h1>

      {counts === null ? (
        <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
          No hemos podido cargar el resumen. Recarga la página para reintentarlo.
        </p>
      ) : (
        <section aria-labelledby="titulo-pedidos" className="overflow-hidden rounded-container border border-border bg-surface">
          <h2 id="titulo-pedidos" className="border-b border-border px-4 py-3 text-lg font-semibold">
            Pedidos por estado
          </h2>
          <ul className="divide-y divide-border">
            {ORDER_STATUSES.map((status) => (
              <li key={status} className="relative flex min-h-(--row-height) items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-accent-soft">
                <AdminStatusBadge status={status} />
                <span className="flex items-center gap-2">
                  <Link
                    href={{ pathname: '/admin/pedidos', query: { estado: status } }}
                    className="tabular font-medium after:absolute after:inset-0 hover:underline"
                    aria-label={`${counts[status]} ${counts[status] === 1 ? 'pedido' : 'pedidos'}: ${statusLabel(status)}`}
                  >
                    {counts[status]}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-4 text-fg-muted" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
