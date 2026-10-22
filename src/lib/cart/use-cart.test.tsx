import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountCartResult, CartLinesResult } from './actions';
import type { CartLineInfo } from './lines';
import { CART_STORAGE_KEY } from './store';

// CA-126 (T-084): el hook compartido por `/carrito` y el carrito lateral. El comportamiento de la página lo vigila `CartView.test.tsx`.

const getCartLinesAction = vi.fn<(ids: readonly string[]) => Promise<CartLinesResult>>();
const saveAccountCartAction = vi.fn<(lines: readonly { variantId: string; qty: number }[]) => Promise<AccountCartResult>>();

vi.mock('./actions', () => ({
  getCartLinesAction: (ids: readonly string[]) => getCartLinesAction(ids),
  saveAccountCartAction: (lines: readonly { variantId: string; qty: number }[]) => saveAccountCartAction(lines),
  mergeGuestCartAction: vi.fn(),
}));

import { useCart } from './use-cart';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function info(variantId: string, overrides: Partial<CartLineInfo> = {}): CartLineInfo {
  return {
    variantId,
    productName: 'Abrigo',
    slug: 'abrigo',
    size: 'M',
    color: 'gris',
    priceCents: 8990,
    compareAtCents: 11990,
    stock: 5,
    image: null,
    ...overrides,
  };
}

function save(lines: ReadonlyArray<{ variantId: string; qty: number }>): void {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

beforeEach(() => {
  window.localStorage.clear();
  getCartLinesAction.mockReset();
  saveAccountCartAction.mockReset();
});
afterEach(() => window.localStorage.clear());

describe('useCart', () => {
  it('sin líneas está vacío y no pregunta al servidor', async () => {
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(getCartLinesAction).not.toHaveBeenCalled();
    expect(result.current.savingsCents).toBe(0);
  });

  it('carga las líneas, calcula los totales y el ahorro de las rebajadas', async () => {
    save([
      { variantId: A, qty: 2 },
      { variantId: B, qty: 1 },
    ]);
    getCartLinesAction.mockResolvedValue({
      status: 'ok',
      lines: [info(A), info(B, { priceCents: 2990, compareAtCents: null })],
    });
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.totals.subtotalCents).toBe(8990 * 2 + 2990);
    expect(result.current.savingsCents).toBe(3000 * 2);
    expect(result.current.lines.map((l) => l.state)).toEqual(['ok', 'ok']);
  });

  it('una línea agotada o no disponible no cuenta ni en el total ni en el ahorro', async () => {
    save([
      { variantId: A, qty: 1 },
      { variantId: B, qty: 1 },
    ]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A, { stock: 0 })] });
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.lines.map((l) => l.state)).toEqual(['soldOut', 'missing']);
    expect(result.current.totals.subtotalCents).toBe(0);
    expect(result.current.savingsCents).toBe(0);
  });

  it('limita la cantidad al stock y avisa al cambiarla; quitar una línea la borra y avisa', async () => {
    save([{ variantId: A, qty: 2 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A, { stock: 3 })] });
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.change(A, 9, info(A, { stock: 3 })));
    await waitFor(() => expect(result.current.lines[0]?.qty).toBe(3));
    expect(result.current.notice?.text).toContain('Solo quedan 3 unidades');
    act(() => result.current.remove(A, 'Abrigo'));
    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.notice?.text).toBe('Abrigo se ha quitado del carrito.');
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('si el servidor falla lo indica y «retry» vuelve a preguntar', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValueOnce({ status: 'error' });
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.status).toBe('failed'));
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(getCartLinesAction).toHaveBeenCalledTimes(2);
  });

  it('con carrito de cuenta, los cambios se aplican al momento y se guardan en el servidor', async () => {
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    saveAccountCartAction.mockImplementation(async (lines) => ({ status: 'ok', cart: lines }));
    const { result } = renderHook(() => useCart([{ variantId: A, qty: 1 }]));
    expect(result.current.isAccount).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.change(A, 2, info(A)));
    expect(result.current.lines[0]?.qty).toBe(2);
    await waitFor(() => expect(saveAccountCartAction).toHaveBeenCalledWith([{ variantId: A, qty: 2 }]));
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('si no se puede guardar en la cuenta, deshace el cambio y avisa', async () => {
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    saveAccountCartAction.mockResolvedValue({ status: 'error' });
    const { result } = renderHook(() => useCart([{ variantId: A, qty: 1 }]));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.change(A, 2, info(A)));
    await waitFor(() => expect(result.current.lines[0]?.qty).toBe(1));
    expect(result.current.notice?.text).toContain('No hemos podido guardar');
  });
});
