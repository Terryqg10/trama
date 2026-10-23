import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckoutCouponProvider } from '@/components/checkout/CheckoutCouponContext';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { CheckoutTotals } from '@/components/checkout/CheckoutTotals';
import { CouponBox } from '@/components/checkout/CouponBox';
import { GuestCartMerger } from '@/components/cart/GuestCartMerger';
import { PageContainer } from '@/components/PageContainer';
import { requireUser } from '@/lib/auth/session';
import { loadAccountCart } from '@/lib/cart/account';
import { fetchCartLines } from '@/lib/cart/lines';
import { releaseOrderReservations } from '@/lib/checkout/reservation';
import { buildCheckoutSummary, describeIssue } from '@/lib/checkout/summary';
import { formatEuros } from '@/lib/domain/shop';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

export const metadata: Metadata = { title: 'Finalizar compra' };

export default async function CheckoutPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { cancelado, carrito } = await searchParams;
  const { client, user } = await requireUser();

  // Vuelta desde Stripe sin pagar: se libera la reserva del pedido pendiente de este cliente.
  const cancelledId = z.string().uuid().safeParse(cancelado);
  let cancelled = false;
  if (cancelledId.success) {
    const own = await client.from('orders').select('id').eq('id', cancelledId.data).eq('status', 'pendiente').maybeSingle();
    if (own.data) {
      await releaseOrderReservations(createServiceClient(), cancelledId.data);
      cancelled = true;
    }
  }

  const [cart, addressRows] = await Promise.all([
    loadAccountCart(client),
    client
      .from('addresses')
      .select('id, recipient_name, line1, line2, postal_code, city, province')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);
  if (cart.length === 0 && !cancelled) redirect('/carrito');
  const infos = await fetchCartLines(
    cart.map((line) => line.variantId),
    client,
  );
  const summary = buildCheckoutSummary(cart, infos);
  const addresses = (addressRows.data ?? []).map((row) => ({
    id: row.id,
    recipientName: row.recipient_name,
    line1: row.line1,
    line2: row.line2,
    postalCode: row.postal_code,
    city: row.city,
    province: row.province,
  }));

  return (
    <PageContainer>
      {carrito === 'fusionado' ? <GuestCartMerger merged /> : null}
      <h1 className="text-display font-bold">Finalizar compra</h1>

      {cancelled ? (
        <p role="status" className="mt-6 rounded-control border border-border-strong px-4 py-3 text-sm font-medium">
          Has vuelto sin pagar. Tu carrito sigue como lo dejaste.
        </p>
      ) : null}

      {summary.issues.length > 0 ? (
        <div role="alert" className="mt-6 space-y-2 rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
          {summary.issues.map((issue) => (
            <p key={`${issue.kind}-${issue.variantId}`}>{describeIssue(issue)}</p>
          ))}
          <Link href="/carrito" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Volver al carrito
          </Link>
        </div>
      ) : null}

      <CheckoutCouponProvider>
      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <CheckoutForm addresses={addresses} disabled={summary.issues.length > 0 || summary.lines.length === 0} />
        </div>

        <section aria-labelledby="resumen-pedido" className="rounded-container border border-border bg-surface p-6">
          <h2 id="resumen-pedido" className="text-lg font-semibold">
            Resumen del pedido
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {summary.lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-4">
                <span>
                  {line.qty} × {line.productName}
                  <span className="block text-fg-muted">
                    Talla {line.size} · {line.color}
                  </span>
                </span>
                <span className="font-medium">{formatEuros(line.unitPriceCents * line.qty)}</span>
              </li>
            ))}
          </ul>
          {summary.lines.length > 0 && summary.issues.length === 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <CouponBox />
            </div>
          ) : null}
          <CheckoutTotals
            subtotalCents={summary.totals.subtotalCents}
            shippingCents={summary.totals.shippingCents}
            totalCents={summary.totals.totalCents}
          />
          <p className="mt-4 text-sm text-fg-muted">IVA incluido.</p>
        </section>
      </div>
      </CheckoutCouponProvider>
    </PageContainer>
  );
}
