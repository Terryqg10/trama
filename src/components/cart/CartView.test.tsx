import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartLinesResult } from '@/lib/cart/actions';
import type { CartLineInfo } from '@/lib/cart/lines';
import { CART_STORAGE_KEY } from '@/lib/cart/store';

const getCartLinesAction = vi.fn<(ids: readonly string[]) => Promise<CartLinesResult>>();

vi.mock('@/lib/cart/actions', () => ({
  getCartLinesAction: (ids: readonly string[]) => getCartLinesAction(ids),
}));

import { CartView } from './CartView';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function info(variantId: string, overrides: Partial<CartLineInfo> = {}): CartLineInfo {
  return {
    variantId,
    productName: 'Polo piqué básico',
    slug: 'polo-pique-basico',
    size: 'M',
    color: 'negro',
    priceCents: 1995,
    stock: 5,
    image: { path: '/products/polos-negro.svg', alt: 'Polo piqué básico, color negro' },
    ...overrides,
  };
}

function save(lines: ReadonlyArray<{ variantId: string; qty: number }>): void {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

function serve(lines: readonly CartLineInfo[]): void {
  getCartLinesAction.mockResolvedValue({ status: 'ok', lines });
}

beforeEach(() => {
  window.localStorage.clear();
  getCartLinesAction.mockReset();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('CartView', () => {
  it('sin líneas muestra el estado vacío y no pregunta al servidor', async () => {
    render(<CartView />);
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(getCartLinesAction).not.toHaveBeenCalled();
  });

  it('cart-unavailable-line (CA-62): una variante que el servidor no devuelve se avisa, no cuenta y se puede quitar', async () => {
    save([
      { variantId: A, qty: 1 },
      { variantId: B, qty: 3 },
    ]);
    serve([info(A)]);
    render(<CartView />);

    const lines = await screen.findAllByTestId('cart-line');
    expect(lines).toHaveLength(2);
    const missing = lines.find((line) => line.getAttribute('data-state') === 'missing');
    expect(missing).toBeDefined();
    expect(within(missing as HTMLElement).getByText('Este artículo ya no está disponible.')).toBeInTheDocument();

    // Solo cuenta la línea disponible: 1 × 19,95 € + envío de tarifa plana.
    expect(screen.getByTestId('cart-subtotal').textContent).toContain('19,95');

    fireEvent.click(within(missing as HTMLElement).getByRole('button', { name: /Quitar/ }));
    await waitFor(() => expect(screen.getAllByTestId('cart-line')).toHaveLength(1));
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([{ variantId: A, qty: 1 }]);
  });

  it('una variante agotada se avisa y no cuenta en el total', async () => {
    save([{ variantId: A, qty: 2 }]);
    serve([info(A, { stock: 0 })]);
    render(<CartView />);

    const line = await screen.findByTestId('cart-line');
    expect(line).toHaveAttribute('data-state', 'soldOut');
    expect(within(line).getByText(/Agotado/)).toBeInTheDocument();
    expect(screen.getByTestId('cart-subtotal').textContent).toContain('0,00');
  });

  it('cart-qty-cap (CA-05): subir por encima del stock lo limita y avisa', async () => {
    save([{ variantId: A, qty: 2 }]);
    serve([info(A, { stock: 2 })]);
    render(<CartView />);

    await screen.findByTestId('cart-line');
    fireEvent.click(screen.getByRole('button', { name: /Añadir una unidad de/ }));

    await waitFor(() => expect(screen.getByText(/Solo quedan 2 unidades/)).toBeInTheDocument());
    expect(screen.getByTestId('cart-qty')).toHaveTextContent('2');
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([{ variantId: A, qty: 2 }]);
  });

  it('si el stock bajó por debajo de la cantidad guardada, se ajusta y se avisa', async () => {
    save([{ variantId: A, qty: 9 }]);
    serve([info(A, { stock: 3 })]);
    render(<CartView />);

    await screen.findByTestId('cart-line');
    expect(screen.getByTestId('cart-qty')).toHaveTextContent('3');
    expect(screen.getByText(/Hemos ajustado la cantidad al stock disponible \(3\)/)).toBeInTheDocument();
    expect(screen.getByTestId('cart-subtotal').textContent).toContain('59,85');
  });

  it('cambiar la cantidad recalcula subtotal, envío y total (CA-61, CA-28)', async () => {
    save([{ variantId: A, qty: 2 }]);
    serve([info(A, { stock: 9 })]);
    render(<CartView />);

    await screen.findByTestId('cart-line');
    // 2 × 19,95 € = 39,90 €: por debajo de 50 €, tarifa plana.
    expect(screen.getByTestId('cart-subtotal').textContent).toContain('39,90');
    expect(screen.getByTestId('cart-shipping').textContent).toContain('4,95');
    expect(screen.getByTestId('cart-free-shipping').textContent).toContain('Te faltan');

    fireEvent.click(screen.getByRole('button', { name: /Añadir una unidad de/ }));
    // 3 × 19,95 € = 59,85 €: envío gratis.
    await waitFor(() => expect(screen.getByTestId('cart-shipping')).toHaveTextContent('Gratis'));
    expect(screen.getByTestId('cart-total').textContent).toContain('59,85');
    expect(screen.getByTestId('cart-free-shipping').textContent).toContain('envío gratis');
  });

  it('si el servidor falla, muestra el error y permite reintentar', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValueOnce({ status: 'error' });
    render(<CartView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido cargar tu carrito.');

    serve([info(A)]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByTestId('cart-line')).toBeInTheDocument();
  });

  it('un carrito guardado manipulado se descarta y se muestra vacío', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{"variantId":"1; drop table"}');
    render(<CartView />);
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(getCartLinesAction).not.toHaveBeenCalled();
  });
});

describe('CartView: enlace para finalizar la compra (T-032)', () => {
  it('un invitado ve «Inicia sesión para finalizar» con el destino /checkout', async () => {
    save([{ variantId: A, qty: 1 }]);
    serve([info(A)]);
    render(<CartView />);

    const link = await screen.findByTestId('cart-checkout');
    expect(link).toHaveTextContent('Inicia sesión para finalizar');
    expect(link.getAttribute('href')).toContain('/acceso');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('siguiente=/checkout');
  });

  it('un cliente con sesión ve «Finalizar compra» que lleva a /checkout', async () => {
    serve([info(A)]);
    render(<CartView initialAccountCart={[{ variantId: A, qty: 1 }]} />);

    const link = await screen.findByTestId('cart-checkout');
    expect(link).toHaveTextContent('Finalizar compra');
    expect(link).toHaveAttribute('href', '/checkout');
  });

  it('sin líneas disponibles no hay enlace para finalizar', async () => {
    save([{ variantId: A, qty: 1 }]);
    serve([info(A, { stock: 0 })]);
    render(<CartView />);

    await screen.findByTestId('cart-line');
    expect(screen.queryByTestId('cart-checkout')).toBeNull();
  });
});
