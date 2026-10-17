import { describe, expect, it, vi } from 'vitest';
import {
  releaseExpiredReservations,
  releaseOrderReservations,
  reserveStock,
  type RpcClient,
} from './reservation';

const ORDER = '33333333-3333-4333-8333-333333333333';
const V1 = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';

type RpcResult = { data: unknown; error: { message: string } | null };

/** Cliente mínimo con solo `rpc`: lo que usa el módulo. No habla con ninguna red. */
function fakeClient(result: RpcResult): { client: RpcClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc }, rpc };
}

describe('reserveStock', () => {
  it('envía las líneas con los nombres de la función SQL y el plazo de 35 minutos', async () => {
    const { client, rpc } = fakeClient({ data: { ok: true, expires_at: '2026-10-17T12:30:00Z' }, error: null });
    const result = await reserveStock(client, ORDER, [{ variantId: V1, qty: 2 }]);

    expect(result).toEqual({ ok: true, expiresAt: '2026-10-17T12:30:00Z' });
    expect(rpc).toHaveBeenCalledWith('reserve_stock', {
      p_order_id: ORDER,
      p_lines: [{ variant_id: V1, qty: 2 }],
      p_ttl: '35 minutes',
    });
  });

  it('devuelve las faltas cuando no hay stock suficiente (CA-18)', async () => {
    const { client } = fakeClient({
      data: {
        ok: false,
        reason: 'insufficient_stock',
        shortages: [{ variant_id: V1, requested: 2, available: 1 }],
      },
      error: null,
    });
    const result = await reserveStock(client, ORDER, [{ variantId: V1, qty: 2 }]);
    expect(result).toEqual({
      ok: false,
      reason: 'insufficient_stock',
      shortages: [{ variantId: V1, requested: 2, available: 1 }],
    });
  });

  it('un fallo de la base de datos lanza (el llamador falla cerrado)', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(reserveStock(client, ORDER, [{ variantId: V1, qty: 1 }])).rejects.toThrow('boom');
  });

  it('una respuesta con otra forma se rechaza en vez de darse por buena', async () => {
    const { client } = fakeClient({ data: { ok: 'quizá' }, error: null });
    await expect(reserveStock(client, ORDER, [{ variantId: V1, qty: 1 }])).rejects.toThrow();
  });

  it.each([
    ['sin líneas', []],
    ['cantidad 0', [{ variantId: V1, qty: 0 }]],
    ['cantidad por encima del tope', [{ variantId: V1, qty: 100 }]],
    ['id que no es uuid', [{ variantId: 'no-uuid', qty: 1 }]],
  ])('no llama a la base de datos con líneas inválidas: %s', async (_name, lines) => {
    const { client, rpc } = fakeClient({ data: { ok: true, expires_at: 'x' }, error: null });
    await expect(reserveStock(client, ORDER, lines)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rechaza un pedido que no es uuid', async () => {
    const { client, rpc } = fakeClient({ data: { ok: true, expires_at: 'x' }, error: null });
    await expect(reserveStock(client, 'abc', [{ variantId: V2, qty: 1 }])).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('liberación', () => {
  it('releaseExpiredReservations devuelve cuántas reservas liberó (CA-19)', async () => {
    const { client, rpc } = fakeClient({ data: 3, error: null });
    expect(await releaseExpiredReservations(client)).toBe(3);
    expect(rpc).toHaveBeenCalledWith('release_expired_reservations');
  });

  it('releaseOrderReservations pasa el pedido validado', async () => {
    const { client, rpc } = fakeClient({ data: 1, error: null });
    expect(await releaseOrderReservations(client, ORDER)).toBe(1);
    expect(rpc).toHaveBeenCalledWith('release_order_reservations', { p_order_id: ORDER });
  });
});
