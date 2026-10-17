import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageContainer } from '@/components/PageContainer';
import { requireUser } from '@/lib/auth/session';
import { formatEuros } from '@/lib/domain/shop';

export const metadata: Metadata = { title: 'Gracias por tu compra' };

export default async function GraciasPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const { client } = await requireUser();
  // RLS: solo devuelve el pedido si es del cliente de la sesión.
  const { data } = await client.from('orders').select('id, status, total_cents').eq('id', id.data).maybeSingle();
  if (!data) notFound();

  const paid = data.status !== 'pendiente' && data.status !== 'cancelado';

  return (
    <PageContainer>
      <div className="mx-auto max-w-xl rounded-container border border-border bg-surface p-8 text-center">
        <h1 className="text-display font-bold">{paid ? 'Gracias por tu compra' : 'Estamos confirmando tu pago'}</h1>
        <p className="mt-4 text-fg-muted">
          {paid
            ? 'Hemos recibido tu pago. En cuanto lo preparemos te avisaremos del envío.'
            : data.status === 'cancelado'
              ? 'Este pedido está cancelado.'
              : 'Stripe nos confirmará el pago en unos segundos. Puedes recargar esta página para ver el estado.'}
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          Pedido {data.id.slice(0, 8)} · {formatEuros(data.total_cents)} · Pagos de prueba: no se cobra nada.
        </p>
        <Link
          href="/novedades"
          className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Seguir comprando
        </Link>
      </div>
    </PageContainer>
  );
}
