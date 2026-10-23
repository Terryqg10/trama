import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// CA-124 (T-085, nivel de componente): estado del carrito lateral. La apertura real, el foco y la animación los comprueba el e2e `cart-drawer`.

let pathname = '/hombre';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { CartDrawerProvider, useCartDrawer } from './CartDrawerContext';

afterEach(() => {
  cleanup();
  pathname = '/hombre';
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <CartDrawerProvider>{children}</CartDrawerProvider>;
}

describe('CartDrawerProvider', () => {
  it('empieza cerrado; openCart lo abre y closeCart lo cierra', () => {
    const { result } = renderHook(() => useCartDrawer(), { wrapper });
    expect(result.current.isCartOpen).toBe(false);
    act(() => result.current.openCart());
    expect(result.current.isCartOpen).toBe(true);
    act(() => result.current.closeCart());
    expect(result.current.isCartOpen).toBe(false);
  });

  it('cuenta las aperturas (el cuerpo se vuelve a montar en cada una)', () => {
    const { result } = renderHook(() => useCartDrawer(), { wrapper });
    expect(result.current.openCount).toBe(0);
    act(() => result.current.openCart());
    act(() => result.current.openCart());
    expect(result.current.openCount).toBe(2);
  });

  it('si cambia la ruta se considera cerrado, sin efecto: el carrito se abrió en otra ruta', () => {
    const { result, rerender } = renderHook(() => useCartDrawer(), { wrapper });
    act(() => result.current.openCart());
    expect(result.current.isCartOpen).toBe(true);
    pathname = '/producto/abrigo-pano-gris';
    rerender();
    expect(result.current.isCartOpen).toBe(false);
  });

  it('recuerda el elemento que tenía el foco al abrir, para devolvérselo al cerrar', () => {
    const { result } = renderHook(() => useCartDrawer(), { wrapper });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    act(() => result.current.openCart());
    expect(result.current.openerRef.current).toBe(button);
    button.remove();
  });

  it('fuera del proveedor no hace nada y no falla', () => {
    const { result } = renderHook(() => useCartDrawer());
    expect(result.current.isCartOpen).toBe(false);
    expect(() => act(() => result.current.openCart())).not.toThrow();
    expect(result.current.isCartOpen).toBe(false);
  });

  it('el proveedor pinta a sus hijos', () => {
    const { getByText } = render(
      <CartDrawerProvider>
        <p>hijo</p>
      </CartDrawerProvider>,
    );
    expect(getByText('hijo')).toBeInTheDocument();
  });
});
