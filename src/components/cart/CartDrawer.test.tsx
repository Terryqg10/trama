import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountCartResult, CartLinesResult } from '@/lib/cart/actions';
import type { CartLineInfo } from '@/lib/cart/lines';
import { CART_STORAGE_KEY } from '@/lib/cart/store';

// CA-124 y CA-125 (T-085, nivel de componente): clases del panel, foco, Esc, fondo, líneas y pie. El e2e `cart-drawer` lo comprueba en el navegador.

const getAccountCartAction = vi.fn<() => Promise<AccountCartResult>>();
const getCartLinesAction = vi.fn<(ids: readonly string[]) => Promise<CartLinesResult>>();
const saveAccountCartAction = vi.fn<(lines: readonly { variantId: string; qty: number }[]) => Promise<AccountCartResult>>();

vi.mock('@/lib/cart/actions', () => ({
  getAccountCartAction: () => getAccountCartAction(),
  getCartLinesAction: (ids: readonly string[]) => getCartLinesAction(ids),
  saveAccountCartAction: (lines: readonly { variantId: string; qty: number }[]) => saveAccountCartAction(lines),
  mergeGuestCartAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/hombre' }));

import { CartDrawer } from './CartDrawer';
import { CartDrawerProvider, useCartDrawer } from './CartDrawerContext';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function info(variantId: string, overrides: Partial<CartLineInfo> = {}): CartLineInfo {
  return {
    variantId,
    productName: 'Abrigo de paño gris',
    slug: 'abrigo-pano-gris',
    size: 'M',
    color: 'gris',
    priceCents: 8990,
    compareAtCents: 11990,
    stock: 5,
    image: { path: '/products/abrigo.svg', alt: 'Abrigo, color gris' },
    ...overrides,
  };
}

function Harness() {
  const { openCart } = useCartDrawer();
  return (
    <>
      <button type="button" data-testid="opener" onClick={openCart}>
        abrir
      </button>
      <CartDrawer />
    </>
  );
}

function save(lines: ReadonlyArray<{ variantId: string; qty: number }>): void {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
}

function open(): void {
  render(
    <CartDrawerProvider>
      <Harness />
    </CartDrawerProvider>,
  );
  // Como un clic real: el botón recibe el foco antes de abrir (el carrito se lo devuelve al cerrar).
  screen.getByTestId('opener').focus();
  fireEvent.click(screen.getByTestId('opener'));
}

beforeEach(() => {
  window.localStorage.clear();
  getAccountCartAction.mockReset();
  getCartLinesAction.mockReset();
  saveAccountCartAction.mockReset();
  getAccountCartAction.mockResolvedValue({ status: 'unauthenticated' });
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.body.style.overflow = '';
});

describe('CartDrawer: panel y accesibilidad (CA-124)', () => {
  it('cerrado está oculto (invisible, sin pulsaciones) y no monta su cuerpo ni pregunta nada al servidor', () => {
    render(
      <CartDrawerProvider>
        <CartDrawer />
      </CartDrawerProvider>,
    );
    const root = screen.getByTestId('cart-drawer-root');
    expect(root.className).toContain('invisible');
    expect(root.className).toContain('pointer-events-none');
    expect(screen.getByTestId('cart-drawer').className).toContain('translate-x-full');
    expect(getAccountCartAction).not.toHaveBeenCalled();
    expect(screen.queryByTestId('cart-drawer-empty')).toBeNull();
  });

  it('abierto es un diálogo modal «Mi cesta» a la derecha, con fondo oscuro de token y por encima de la cabecera', async () => {
    open();
    const dialog = screen.getByRole('dialog', { name: 'Mi cesta' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    for (const cls of ['absolute', 'inset-y-0', 'right-0', 'w-full', 'max-w-md', 'bg-surface', 'shadow-2xl', 'translate-x-0', 'opacity-100', 'transition', 'motion-reduce:transition-none']) {
      expect(dialog.className, cls).toContain(cls);
    }
    expect(screen.getByTestId('cart-drawer-root').className).toContain('z-60');
    expect(screen.getByTestId('cart-drawer-root').className).toContain('visible');
    expect(screen.getByTestId('cart-drawer-backdrop').className).toContain('bg-fg/50');
    expect(screen.getByTestId('cart-drawer-backdrop').className).not.toMatch(/black|#/);
    await waitFor(() => expect(screen.getByTestId('cart-drawer-empty')).toBeInTheDocument());
  });

  it('el foco entra en el botón de cerrar, el body no hace scroll y al cerrar el foco vuelve al botón que lo abrió', async () => {
    open();
    expect(screen.getByTestId('cart-drawer-close')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByTestId('cart-drawer-close'));
    await waitFor(() => expect(screen.getByTestId('cart-drawer-root').className).toContain('invisible'));
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByTestId('opener')).toHaveFocus();
  });

  it('al bloquear el scroll compensa el ancho de la barra de desplazamiento para que la página no dé un salto, y lo restaura al cerrar', async () => {
    const innerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    const clientWidth = vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(985);
    try {
      open();
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe('15px');
      fireEvent.click(screen.getByTestId('cart-drawer-close'));
      await waitFor(() => expect(screen.getByTestId('cart-drawer-root').className).toContain('invisible'));
      expect(document.body.style.paddingRight).toBe('');
    } finally {
      clientWidth.mockRestore();
      if (innerWidth) Object.defineProperty(window, 'innerWidth', innerWidth);
    }
  });

  it('sin barra de desplazamiento (móvil, scrollbars flotantes) no añade relleno', () => {
    const clientWidth = vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(window.innerWidth);
    try {
      open();
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe('');
    } finally {
      clientWidth.mockRestore();
    }
  });

  it('Esc y un clic en el fondo lo cierran; un clic dentro no', async () => {
    open();
    await waitFor(() => expect(screen.getByTestId('cart-drawer-empty')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('cart-drawer'));
    expect(screen.getByTestId('cart-drawer-root').className).toContain('visible');
    fireEvent.click(screen.getByTestId('cart-drawer-backdrop'));
    await waitFor(() => expect(screen.getByTestId('cart-drawer-root').className).toContain('invisible'));
    fireEvent.click(screen.getByTestId('opener'));
    expect(screen.getByTestId('cart-drawer-root').className).toContain('visible');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('cart-drawer-root').className).toContain('invisible'));
  });

  it('atrapa el foco: Tab desde el último elemento vuelve al primero y Mayús+Tab desde el primero va al último', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    open();
    await screen.findByTestId('drawer-line');
    const panel = screen.getByTestId('cart-drawer');
    const items = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    expect(first).toBe(screen.getByTestId('cart-drawer-close'));
    expect(last).toBe(screen.getByTestId('drawer-view-cart'));
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});

describe('CartDrawer: contenido y pie (CA-125)', () => {
  it('sin prendas: «Tu cesta está vacía» y «Seguir comprando», sin total ni «Tramitar compra»', async () => {
    open();
    expect(await screen.findByText('Tu cesta está vacía')).toBeInTheDocument();
    expect(screen.getByTestId('cart-drawer-continue')).toHaveTextContent('Seguir comprando');
    expect(screen.queryByTestId('drawer-total')).toBeNull();
    expect(screen.queryByTestId('drawer-checkout')).toBeNull();
  });

  it('cada línea: miniatura, nombre con enlace, talla y color, unitario, controles y total con el anterior tachado', async () => {
    save([{ variantId: A, qty: 2 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    open();
    const line = await screen.findByTestId('drawer-line');
    expect(within(line).getByRole('img')).toHaveAttribute('alt', 'Abrigo, color gris');
    expect(within(line).getByRole('link', { name: 'Abrigo de paño gris' }).getAttribute('href')).toContain('/producto/abrigo-pano-gris');
    expect(line).toHaveTextContent('Talla M · Gris');
    expect(within(line).getByTestId('drawer-unit-price')).toHaveTextContent(/89,90/);
    expect(within(line).getByTestId('drawer-unit-before').tagName).toBe('DEL');
    expect(within(line).getByTestId('drawer-qty')).toHaveTextContent('2');
    expect(within(line).getByTestId('drawer-line-total').querySelector('span')).toHaveTextContent(/179,80/);
    expect(within(line).getByTestId('drawer-line-before')).toHaveTextContent(/239,80/);
    expect(within(line).getByTestId('drawer-line-before').className).toContain('line-through');
  });

  it('el pie: «Ahorras» solo con rebaja, total con envío, aviso de envío gratis y los dos botones', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    open();
    await screen.findByTestId('drawer-line');
    expect(screen.getByTestId('drawer-savings')).toHaveTextContent(/Ahorras\s+30,00/);
    expect(screen.getByTestId('drawer-total')).toHaveTextContent(/89,90/);
    expect(screen.getByTestId('drawer-free-shipping')).toHaveTextContent('envío gratis');
    expect(screen.getByTestId('drawer-checkout')).toHaveTextContent('Tramitar compra');
    expect(screen.getByTestId('drawer-checkout').className).toContain('bg-accent');
    expect(screen.getByTestId('cart-drawer-continue')).toHaveTextContent('Seguir comprando');
  });

  it('sin rebaja no hay «Ahorras» ni precios tachados', async () => {
    save([{ variantId: B, qty: 1 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(B, { priceCents: 2990, compareAtCents: null })] });
    open();
    await screen.findByTestId('drawer-line');
    expect(screen.queryByTestId('drawer-savings')).toBeNull();
    expect(screen.queryByTestId('drawer-unit-before')).toBeNull();
    expect(screen.queryByTestId('drawer-line-before')).toBeNull();
    expect(screen.getByTestId('drawer-free-shipping')).toHaveTextContent('Te faltan');
  });

  it('«+», «−» y «Quitar» cambian el carrito del navegador', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    open();
    await screen.findByTestId('drawer-line');
    fireEvent.click(screen.getByTestId('drawer-plus'));
    await waitFor(() => expect(screen.getByTestId('drawer-qty')).toHaveTextContent('2'));
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]')).toEqual([{ variantId: A, qty: 2 }]);
    fireEvent.click(screen.getByTestId('drawer-minus'));
    await waitFor(() => expect(screen.getByTestId('drawer-qty')).toHaveTextContent('1'));
    fireEvent.click(screen.getByTestId('drawer-remove'));
    expect(await screen.findByText('Tu cesta está vacía')).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('invitado: «Tramitar compra» va a iniciar sesión; con sesión, directo a /checkout y el carrito es el de la cuenta', async () => {
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    open();
    await screen.findByTestId('drawer-line');
    expect(screen.getByTestId('drawer-checkout').getAttribute('href')).toBe('/acceso?siguiente=%2Fcheckout');
    cleanup();
    window.localStorage.clear();
    getAccountCartAction.mockResolvedValue({ status: 'ok', cart: [{ variantId: B, qty: 3 }] });
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(B)] });
    open();
    await screen.findByTestId('drawer-line');
    expect(screen.getByTestId('drawer-qty')).toHaveTextContent('3');
    expect(screen.getByTestId('drawer-checkout').getAttribute('href')).toBe('/checkout');
  });

  it('con sesión, cambiar la cantidad se guarda en la cuenta y no en el navegador', async () => {
    getAccountCartAction.mockResolvedValue({ status: 'ok', cart: [{ variantId: A, qty: 1 }] });
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    saveAccountCartAction.mockImplementation(async (lines) => ({ status: 'ok', cart: lines }));
    open();
    await screen.findByTestId('drawer-line');
    fireEvent.click(screen.getByTestId('drawer-plus'));
    await waitFor(() => expect(saveAccountCartAction).toHaveBeenCalledWith([{ variantId: A, qty: 2 }]));
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('si falla la consulta de la sesión usa el carrito del navegador; si fallan las líneas, ofrece reintentar', async () => {
    getAccountCartAction.mockRejectedValue(new Error('sin red'));
    save([{ variantId: A, qty: 1 }]);
    getCartLinesAction.mockResolvedValueOnce({ status: 'error' });
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido cargar tu cesta.');
    getCartLinesAction.mockResolvedValue({ status: 'ok', lines: [info(A)] });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(await screen.findByTestId('drawer-line')).toBeInTheDocument();
  });

  it('cada apertura vuelve a preguntar si hay sesión', async () => {
    open();
    await screen.findByText('Tu cesta está vacía');
    expect(getAccountCartAction).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('cart-drawer-close'));
    fireEvent.click(screen.getByTestId('opener'));
    await waitFor(() => expect(getAccountCartAction).toHaveBeenCalledTimes(2));
  });
});
