import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// CA-12 (T-105, nivel de componente): diálogo accesible con pestañas, cierre con Esc, X y fondo, y cambio de pestaña. El flujo
// real con sesión, los errores del servidor y el carrito lo comprueban los e2e `auth-modal`.

vi.mock('@/lib/auth/actions', () => ({
  loginAction: vi.fn(),
  registerAction: vi.fn(),
  recoverAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));
vi.mock('@/lib/cart/store', () => ({ useSavedCart: () => [] }));

import { AuthModal } from './AuthModal';

afterEach(cleanup);

describe('AuthModal', () => {
  it('cerrado no pinta nada', () => {
    const { container } = render(<AuthModal open={false} onClose={() => undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('abierto es un diálogo modal con nombre, dos pestañas y el formulario de entrar', () => {
    render(<AuthModal open onClose={() => undefined} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Iniciar sesión', 'Crear cuenta']);
    expect(screen.getByRole('tab', { name: 'Iniciar sesión' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre')).toBeNull();
  });

  it('cambia de pestaña con el clic, con el enlace del formulario y con las flechas', () => {
    render(<AuthModal open onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    expect(screen.getByLabelText('Nombre')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Crear cuenta' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión', hidden: false }).closest('p')?.querySelector('button') ?? screen.getByRole('tab', { name: 'Iniciar sesión' }));
    expect(screen.queryByLabelText('Nombre')).toBeNull();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Iniciar sesión' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Crear cuenta' }).getAttribute('aria-selected')).toBe('true');
  });

  it('Esc, la X y el fondo lo cierran', () => {
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('auth-modal-close'));
    fireEvent.click(screen.getByTestId('auth-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('el body no hace scroll mientras está abierto y se restaura al cerrar', () => {
    const { rerender } = render(<AuthModal open onClose={() => undefined} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<AuthModal open={false} onClose={() => undefined} />);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
