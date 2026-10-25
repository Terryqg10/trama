import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountNav } from './AccountNav';

// CA-07 y CA-09 (T-102): entradas, página activa y «Cerrar sesión» como formulario.

let pathname = '/cuenta';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/lib/auth/actions', () => ({ logoutAction: vi.fn() }));

afterEach(cleanup);

describe('AccountNav', () => {
  it('es una navegación con nombre y tiene las entradas con destino real', () => {
    render(<AccountNav />);
    expect(screen.getByRole('navigation', { name: 'Mi cuenta' })).toBeTruthy();
    const links = screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);
    expect(links).toEqual([
      ['Mis datos', '/cuenta'],
      ['Mis pedidos', '/cuenta/pedidos'],
      ['Mis favoritos', '/cuenta/favoritos'],
      ['Trama Club', '/cuenta/club'],
    ]);
    expect(screen.getByRole('button', { name: 'Cerrar sesión' }).closest('form')).not.toBeNull();
  });

  it.each([
    ['/cuenta', 'Mis datos'],
    ['/cuenta/direcciones/nueva', 'Mis datos'],
    ['/cuenta/pedidos', 'Mis pedidos'],
    ['/cuenta/pedidos/abc', 'Mis pedidos'],
    ['/cuenta/favoritos', 'Mis favoritos'],
    ['/cuenta/club', 'Trama Club'],
  ])('en %s marca «%s» con aria-current', (path, label) => {
    pathname = path;
    render(<AccountNav />);
    const current = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });
});
