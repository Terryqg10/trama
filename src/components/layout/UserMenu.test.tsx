import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CA-17 a CA-20 (T-107, nivel de componente): menú con sesión, modal sin sesión, cierre y teclado. El flujo real (sesión,
// cierre de sesión, anchos, axe) lo comprueban los e2e `user-menu`.

const sessionStatus = vi.fn();
let pathname = '/novedades';

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/auth/actions', () => ({
  sessionStatusAction: () => sessionStatus(),
  logoutAction: vi.fn(),
  loginAction: vi.fn(),
  registerAction: vi.fn(),
  recoverAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));
vi.mock('@/lib/cart/store', () => ({ useSavedCart: () => [] }));

import { UserMenu } from './UserMenu';

beforeEach(() => {
  pathname = '/novedades';
  sessionStatus.mockReset();
});
afterEach(cleanup);

async function openWithSession(name = 'Ana') {
  sessionStatus.mockResolvedValue({ signedIn: true, name });
  render(<UserMenu />);
  await act(async () => {
    fireEvent.click(screen.getByTestId('account-open'));
  });
}

describe('UserMenu con sesión (CA-17)', () => {
  it('el icono anuncia el menú y, al pulsarlo, lo abre con el saludo y las cuatro entradas', async () => {
    sessionStatus.mockResolvedValue({ signedIn: true, name: 'Ana' });
    render(<UserMenu />);
    const trigger = screen.getByTestId('account-open');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByTestId('user-menu-greeting').textContent).toBe('Hola, Ana');
    expect(screen.getAllByRole('menuitem').map((item) => [item.textContent, item.getAttribute('href')])).toEqual([
      ['Mis datos', '/cuenta'],
      ['Mis pedidos', '/cuenta/pedidos'],
      ['Trama Club', '/cuenta/club'],
      ['Cerrar sesión', null],
    ]);
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' }).closest('form')).not.toBeNull();
  });

  it('sin nombre en el perfil saluda solo con «Hola»', async () => {
    await openWithSession('');
    expect(screen.getByTestId('user-menu-greeting').textContent).toBe('Hola');
  });

  it('la primera entrada recibe el foco', async () => {
    await openWithSession();
    expect(document.activeElement?.textContent).toBe('Mis datos');
  });
});

describe('UserMenu: cierre y teclado (CA-18, CA-19)', () => {
  it('Esc lo cierra y devuelve el foco al icono', async () => {
    await openWithSession();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('account-open'));
  });

  it('un clic fuera lo cierra; uno dentro, no', async () => {
    await openWithSession();
    fireEvent.pointerDown(screen.getByTestId('user-menu-greeting'));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('elegir una entrada lo cierra; pulsar el icono otra vez también', async () => {
    await openWithSession();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mis pedidos' }));
    expect(screen.queryByRole('menu')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-open'));
    });
    expect(screen.getByRole('menu')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-open'));
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('las flechas, Inicio y Fin recorren las entradas, y Tab cierra el menú', async () => {
    await openWithSession();
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Mis pedidos');
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement?.textContent).toBe('Cerrar sesión');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Mis datos');
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toBe('Cerrar sesión');
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement?.textContent).toBe('Mis datos');
    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('UserMenu sin sesión y en las páginas de acceso (CA-20)', () => {
  it('sin sesión abre el modal de acceso y no el menú', async () => {
    sessionStatus.mockResolvedValue({ signedIn: false });
    render(<UserMenu />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-open'));
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('en /acceso el icono no consulta la sesión: navega', () => {
    pathname = '/acceso';
    render(<UserMenu />);
    fireEvent.click(screen.getByTestId('account-open'));
    expect(sessionStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('account-open').getAttribute('href')).toBe('/cuenta');
  });
});
