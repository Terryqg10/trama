import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import type { RpcClient } from './reservation';
import { handleStripeEvent, orderIdFromSession } from './webhook';

const ORDER = '33333333-3333-4333-8333-333333333333';

type RpcResult = { data: unknown; error: { message: string } | null };

function fakeClient(result: RpcResult): { client: RpcClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc }, rpc };
}

/** Evento mínimo: solo los campos que lee el manejador. El SDK exige el objeto completo al tipar. */
function sessionEvent(
  type: 'checkout.session.completed' | 'checkout.session.async_payment_succeeded' | 'checkout.session.expired',
  session: Partial<Stripe.Checkout.Session>,
): Stripe.Event {
  const event = { id: 'evt_test_1', type, data: { object: session } };
  return event as Stripe.Event;
}

describe('orderIdFromSession', () => {
  it('usa client_reference_id y, si falta, el metadato order_id', () => {
    expect(orderIdFromSession({ client_reference_id: ORDER })).toBe(ORDER);
    expect(orderIdFromSession({ client_reference_id: null, metadata: { order_id: ORDER } })).toBe(ORDER);
  });

  it('rechaza lo que no es un uuid', () => {
    expect(orderIdFromSession({ client_reference_id: '1; drop table' })).toBeNull();
    expect(orderIdFromSession({ client_reference_id: null })).toBeNull();
  });
});

describe('handleStripeEvent', () => {
  it('confirma el pago de una sesión pagada con el id del evento (CA-11)', async () => {
    const { client, rpc } = fakeClient({ data: { ok: true, result: 'paid' }, error: null });
    const outcome = await handleStripeEvent(
      client,
      sessionEvent('checkout.session.completed', { client_reference_id: ORDER, payment_status: 'paid' }),
    );
    expect(outcome).toEqual({ kind: 'paid' });
    expect(rpc).toHaveBeenCalledWith('confirm_order_payment', { p_order_id: ORDER, p_event_id: 'evt_test_1' });
  });

  it('un evento repetido se reconoce como duplicado (CA-13)', async () => {
    const { client } = fakeClient({ data: { ok: true, result: 'duplicate' }, error: null });
    const outcome = await handleStripeEvent(
      client,
      sessionEvent('checkout.session.async_payment_succeeded', { client_reference_id: ORDER, payment_status: 'paid' }),
    );
    expect(outcome).toEqual({ kind: 'duplicate' });
  });

  it('una sesión que aún no está pagada no confirma nada', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    const outcome = await handleStripeEvent(
      client,
      sessionEvent('checkout.session.completed', { client_reference_id: ORDER, payment_status: 'unpaid' }),
    );
    expect(outcome).toEqual({ kind: 'ignored' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('un pago para un pedido no pendiente o inexistente se señala para revisión', async () => {
    const { client } = fakeClient({ data: { ok: true, result: 'not_pending', status: 'cancelado' }, error: null });
    const outcome = await handleStripeEvent(
      client,
      sessionEvent('checkout.session.completed', { client_reference_id: ORDER, payment_status: 'paid' }),
    );
    expect(outcome).toEqual({ kind: 'lateOrUnknown', reason: 'not_pending' });
  });

  it('una sesión sin pedido válido no llama a la base de datos', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    const outcome = await handleStripeEvent(
      client,
      sessionEvent('checkout.session.completed', { client_reference_id: 'no-uuid', payment_status: 'paid' }),
    );
    expect(outcome).toEqual({ kind: 'lateOrUnknown', reason: 'invalid_order' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('un fallo de la base de datos lanza para que el webhook responda 500', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(
      handleStripeEvent(client, sessionEvent('checkout.session.completed', { client_reference_id: ORDER, payment_status: 'paid' })),
    ).rejects.toThrow('boom');
  });

  it('una sesión caducada libera la reserva del pedido', async () => {
    const { client, rpc } = fakeClient({ data: 1, error: null });
    const outcome = await handleStripeEvent(client, sessionEvent('checkout.session.expired', { client_reference_id: ORDER }));
    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(rpc).toHaveBeenCalledWith('release_order_reservations', { p_order_id: ORDER });
  });

  it('un evento de otro tipo se ignora', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    const other = { id: 'evt_x', type: 'customer.created', data: { object: {} } } as Stripe.Event;
    expect(await handleStripeEvent(client, other)).toEqual({ kind: 'ignored' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
