import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { z } from 'zod';
import { loadAccountCart } from '@/lib/cart/account';
import { fetchCartLines } from '@/lib/cart/lines';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { CHECKOUT_SESSION_MINUTES, releaseOrderReservations, reserveStock } from './reservation';
import { buildCheckoutSummary, type CheckoutIssue } from './summary';

/**
 * Checkout (RF-06, CA-09, CA-10). El navegador solo aporta el id de la dirección elegida: precios,
 * cantidades y totales salen de la BD y del carrito de la cuenta. Orden de las operaciones:
 * pedido pendiente → reserva de stock → sesión de pago. Si algo falla después de crear el pedido,
 * se libera la reserva y el pedido queda cancelado (falla cerrado, sin cobrar).
 */

/** Entrada del formulario. Cualquier otro campo (precio, total, cantidades…) se descarta. */
export const checkoutInputSchema = z.object({ addressId: z.string().uuid() });

const addressRowSchema = z.object({
  id: z.string(),
  recipient_name: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  postal_code: z.string(),
  city: z.string(),
  province: z.string(),
  country: z.string(),
});

const idRowSchema = z.object({ id: z.string() });

export interface CheckoutDeps {
  /** Cliente con la sesión del cliente: la RLS limita la dirección y el carrito a su dueño. */
  readonly userClient: PublicSupabaseClient;
  /** Cliente de servicio: solo para crear el pedido y reservar (las tablas no admiten insertar al cliente). */
  readonly serviceClient: SupabaseClient;
  readonly stripe: Stripe;
  /** Reloj inyectable para las pruebas. */
  readonly now?: () => number;
}

export interface CheckoutRequest {
  readonly userId: string;
  readonly email: string | null;
  readonly addressId: string;
  /** Origen público de la web (para las URL de retorno). */
  readonly origin: string;
}

export type CheckoutResult =
  | { readonly status: 'redirect'; readonly url: string; readonly orderId: string }
  | { readonly status: 'empty' }
  | { readonly status: 'invalidAddress' }
  | { readonly status: 'blocked'; readonly issues: readonly CheckoutIssue[] }
  | { readonly status: 'error' };

function logFailure(step: string, error: unknown): void {
  console.error(`createCheckout: falló ${step}`, error instanceof Error ? error.message : 'error desconocido');
}

export async function createCheckout(deps: CheckoutDeps, request: CheckoutRequest): Promise<CheckoutResult> {
  const { userClient, serviceClient, stripe } = deps;
  const now = deps.now ?? Date.now;

  // 1. Dirección (la RLS garantiza que es del usuario) y carrito de la cuenta.
  const addressResult = await userClient
    .from('addresses')
    .select('id, recipient_name, line1, line2, postal_code, city, province, country')
    .eq('id', request.addressId)
    .maybeSingle();
  if (addressResult.error) {
    logFailure('la lectura de la dirección', addressResult.error);
    return { status: 'error' };
  }
  const address = addressResult.data ? addressRowSchema.parse(addressResult.data) : null;
  if (!address) return { status: 'invalidAddress' };

  let summary: ReturnType<typeof buildCheckoutSummary>;
  try {
    const cart = await loadAccountCart(userClient);
    if (cart.length === 0) return { status: 'empty' };
    const infos = await fetchCartLines(
      cart.map((line) => line.variantId),
      userClient,
    );
    summary = buildCheckoutSummary(cart, infos);
  } catch (error) {
    logFailure('la lectura del carrito', error);
    return { status: 'error' };
  }
  if (summary.issues.length > 0) return { status: 'blocked', issues: summary.issues };
  if (summary.lines.length === 0) return { status: 'empty' };

  // 2. Un nuevo intento sustituye a los pedidos pendientes anteriores del cliente: así no se acumulan
  // reservas de stock ni sesiones de pago abiertas por repetir el checkout.
  try {
    const previous = await serviceClient
      .from('orders')
      .select('id')
      .eq('user_id', request.userId)
      .eq('status', 'pendiente');
    if (previous.error) throw new Error(previous.error.message);
    for (const row of z.array(idRowSchema).parse(previous.data)) {
      await releaseOrderReservations(serviceClient, row.id);
    }
  } catch (error) {
    logFailure('la liberación de pedidos pendientes anteriores', error);
    return { status: 'error' };
  }

  // 3. Pedido pendiente con la dirección como instantánea y sus líneas.
  const orderResult = await serviceClient
    .from('orders')
    .insert({
      user_id: request.userId,
      total_cents: summary.totals.totalCents,
      shipping_cents: summary.totals.shippingCents,
      shipping_address: {
        recipient_name: address.recipient_name,
        line1: address.line1,
        line2: address.line2,
        postal_code: address.postal_code,
        city: address.city,
        province: address.province,
        country: address.country,
      },
    })
    .select('id')
    .single();
  if (orderResult.error) {
    logFailure('la creación del pedido', orderResult.error);
    return { status: 'error' };
  }
  const orderId = idRowSchema.parse(orderResult.data).id;

  const itemsResult = await serviceClient.from('order_items').insert(
    summary.lines.map((line) => ({
      order_id: orderId,
      variant_id: line.variantId,
      product_name: line.productName,
      size: line.size,
      color: line.color,
      qty: line.qty,
      unit_price_cents: line.unitPriceCents,
    })),
  );
  if (itemsResult.error) {
    logFailure('las líneas del pedido', itemsResult.error);
    await serviceClient.from('orders').delete().eq('id', orderId);
    return { status: 'error' };
  }

  // 4. Reserva de stock, todo o nada. Si no cabe, el pedido se cancela.
  try {
    const reservation = await reserveStock(
      serviceClient,
      orderId,
      summary.lines.map((line) => ({ variantId: line.variantId, qty: line.qty })),
    );
    if (!reservation.ok) {
      await releaseOrderReservations(serviceClient, orderId);
      const names = new Map(summary.lines.map((line) => [line.variantId, line]));
      const issues: CheckoutIssue[] = reservation.shortages.map((shortage) => {
        const line = names.get(shortage.variantId);
        return {
          kind: 'insufficientStock',
          variantId: shortage.variantId,
          name: line ? `${line.productName}, talla ${line.size}, color ${line.color}` : 'Una prenda',
          requested: shortage.requested,
          available: shortage.available,
        };
      });
      return issues.length > 0 ? { status: 'blocked', issues } : { status: 'error' };
    }
  } catch (error) {
    logFailure('la reserva de stock', error);
    await releaseOrderReservations(serviceClient, orderId).catch(() => undefined);
    return { status: 'error' };
  }

  // 5. Sesión de pago de Stripe con los importes del servidor.
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        locale: 'es',
        client_reference_id: orderId,
        ...(request.email ? { customer_email: request.email } : {}),
        line_items: summary.lines.map((line) => ({
          quantity: line.qty,
          price_data: {
            currency: 'eur',
            unit_amount: line.unitPriceCents,
            product_data: { name: `${line.productName} · talla ${line.size} · ${line.color}` },
          },
        })),
        ...(summary.totals.shippingCents > 0
          ? {
              shipping_options: [
                {
                  shipping_rate_data: {
                    type: 'fixed_amount' as const,
                    display_name: 'Envío a domicilio',
                    fixed_amount: { amount: summary.totals.shippingCents, currency: 'eur' },
                  },
                },
              ],
            }
          : {}),
        metadata: { order_id: orderId },
        payment_intent_data: { metadata: { order_id: orderId } },
        expires_at: Math.floor(now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
        success_url: `${request.origin}/pedido/${orderId}/gracias`,
        cancel_url: `${request.origin}/checkout?cancelado=${orderId}`,
      },
      { idempotencyKey: `checkout-${orderId}` },
    );
    if (!session.url) throw new Error('Stripe no devolvió la URL de pago');

    const saved = await serviceClient.from('orders').update({ stripe_session_id: session.id }).eq('id', orderId);
    if (saved.error) throw new Error(saved.error.message);

    return { status: 'redirect', url: session.url, orderId };
  } catch (error) {
    logFailure('la sesión de pago', error);
    await releaseOrderReservations(serviceClient, orderId).catch(() => undefined);
    return { status: 'error' };
  }
}
