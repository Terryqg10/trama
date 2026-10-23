import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddToAccountResult } from '@/lib/cart/actions';
import { CART_STORAGE_KEY } from '@/lib/cart/store';

// CA-124 (T-085, nivel de componente): al añadir con éxito se abre el carrito lateral; si no se añade nada, no.

const addToAccountCartAction = vi.fn<(variantId: string) => Promise<AddToAccountResult>>();
const openCart = vi.fn();

vi.mock('@/lib/cart/actions', () => ({
  addToAccountCartAction: (variantId: string) => addToAccountCartAction(variantId),
  mergeGuestCartAction: vi.fn(),
}));
vi.mock('./CartDrawerContext', () => ({ useCartDrawer: () => ({ openCart }) }));

import { AddToCartButton } from './AddToCartButton';

const VARIANT = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  window.localStorage.clear();
  openCart.mockReset();
  addToAccountCartAction.mockReset();
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('AddToCartButton y el carrito lateral', () => {
  it('invitado: al añadir guarda en el navegador, avisa y abre el carrito', async () => {
    render(<AddToCartButton variantId={VARIANT} stock={5} productName="Polo" signedIn={false} />);
    const button = await screen.findByRole('button', { name: 'Añadir al carrito' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('Polo añadido al carrito.')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([{ variantId: VARIANT, qty: 1 }]);
    expect(openCart).toHaveBeenCalledTimes(1);
  });

  it('invitado: si ya tiene todas las unidades no añade nada y no abre el carrito', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ variantId: VARIANT, qty: 2 }]));
    render(<AddToCartButton variantId={VARIANT} stock={2} productName="Polo" signedIn={false} />);
    const button = await screen.findByRole('button', { name: 'Añadir al carrito' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText(/Ya tienes en el carrito todas las unidades disponibles/)).toBeInTheDocument();
    expect(openCart).not.toHaveBeenCalled();
  });

  it('con sesión: añade en la cuenta y abre el carrito; si no está disponible o falla, no lo abre', async () => {
    addToAccountCartAction.mockResolvedValue({ status: 'ok', cart: [{ variantId: VARIANT, qty: 1 }], capped: false, stock: 5 });
    render(<AddToCartButton variantId={VARIANT} stock={5} productName="Polo" signedIn />);
    const button = await screen.findByRole('button', { name: 'Añadir al carrito' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(openCart).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();

    addToAccountCartAction.mockResolvedValue({ status: 'unavailable' });
    fireEvent.click(button);
    expect(await screen.findByText('Esta prenda ya no está disponible.')).toBeInTheDocument();
    addToAccountCartAction.mockResolvedValue({ status: 'error' });
    fireEvent.click(button);
    expect(await screen.findByText(/No hemos podido añadirla/)).toBeInTheDocument();
    expect(openCart).toHaveBeenCalledTimes(1);
  });

  it('sin talla elegida el botón está desactivado y no abre nada', async () => {
    render(<AddToCartButton variantId={null} stock={0} productName="Polo" signedIn={false} />);
    expect(await screen.findByRole('button', { name: 'Añadir al carrito' })).toBeDisabled();
    expect(openCart).not.toHaveBeenCalled();
  });
});
