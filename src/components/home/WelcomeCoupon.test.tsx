import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CA-136 (T-094, nivel de componente): el código de bienvenida que se enseña tras suscribirse. La suscripción real, el modal y la
// maquetación de 320 a 1280 px los comprueba el e2e `welcome-coupon`.

const subscribeAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/newsletter', () => ({ subscribeAction }));

import type { NewsletterState } from '@/lib/newsletter/state';
import { NewsletterForm } from './NewsletterForm';
import { WelcomeCoupon } from './WelcomeCoupon';

const EXPIRES = '2026-11-23T12:00:00.000Z';

beforeEach(() => {
  subscribeAction.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('WelcomeCoupon (CA-136)', () => {
  it('con un código válido enseña «Tu código de bienvenida: …», la validez y el aviso de demostración, con botón de copiar', () => {
    render(<WelcomeCoupon notice={{ status: 'issued', code: 'TRAMA-ABCD-EF23', expiresAt: EXPIRES }} />);
    const note = screen.getByTestId('welcome-coupon');
    expect(note.getAttribute('role')).toBe('note');
    expect(note.textContent).toContain('Tu código de bienvenida: TRAMA-ABCD-EF23');
    expect(screen.getByTestId('welcome-coupon-code').textContent).toBe('TRAMA-ABCD-EF23');
    expect(note.textContent).toContain('10 % en tu primera compra');
    expect(note.textContent).toContain('23 de noviembre de 2026');
    expect(note.textContent).toContain('Código de demostración: se canjea en el pago.');
    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeTruthy();
  });

  it('no promete ningún email', () => {
    render(<WelcomeCoupon notice={{ status: 'existing', code: 'TRAMA-ABCD-EF23', expiresAt: EXPIRES }} />);
    expect(screen.getByTestId('welcome-coupon').textContent?.toLowerCase()).not.toContain('email');
  });

  it('el mismo aviso sirve a un código recuperado (existing)', () => {
    render(<WelcomeCoupon notice={{ status: 'existing', code: 'TRAMA-ZZZZ-2222', expiresAt: EXPIRES }} />);
    expect(screen.getByTestId('welcome-coupon-code').textContent).toBe('TRAMA-ZZZZ-2222');
  });

  it('el botón copia el código', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<WelcomeCoupon notice={{ status: 'issued', code: 'TRAMA-ABCD-EF23', expiresAt: EXPIRES }} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
    });
    expect(writeText).toHaveBeenCalledWith('TRAMA-ABCD-EF23');
    expect(screen.getByRole('status').textContent).toBe('Copiado.');
  });

  it('un código caducado solo se dice, sin código ni botón', () => {
    render(<WelcomeCoupon notice={{ status: 'expired' }} />);
    expect(screen.getByTestId('welcome-coupon-expired').textContent).toBe('Tu código de bienvenida ha caducado.');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('welcome-coupon-code')).toBeNull();
  });

  it('un código ya usado solo se dice, sin código ni botón', () => {
    render(<WelcomeCoupon notice={{ status: 'redeemed' }} />);
    expect(screen.getByTestId('welcome-coupon-redeemed').textContent).toBe('Tu código de bienvenida ya se ha usado.');
    expect(screen.queryByRole('button', { name: 'Copiar código' })).toBeNull();
  });
});

describe('NewsletterForm con cupón (CA-136)', () => {
  async function submitWith(state: NewsletterState) {
    subscribeAction.mockResolvedValue(state);
    render(<NewsletterForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Suscribirme' }).closest('form') as HTMLFormElement);
    });
  }

  it('tras suscribirse con éxito muestra el mensaje y el código dentro de la región aria-live', async () => {
    await submitWith({
      status: 'success',
      message: '¡Gracias por suscribirte! Te avisaremos de las novedades y ofertas.',
      coupon: { status: 'issued', code: 'TRAMA-ABCD-EF23', expiresAt: EXPIRES },
    });
    const live = screen.getByTestId('newsletter-message');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('¡Gracias por suscribirte!');
    expect(live.querySelector('[data-testid="welcome-coupon-code"]')?.textContent).toBe('TRAMA-ABCD-EF23');
  });

  it('con éxito enseña el enlace de confirmación (CA-103) y el campo trampa no es accesible ni se alcanza (CA-104)', async () => {
    await submitWith({
      status: 'success',
      message: '¡Gracias por suscribirte! Falta un paso: confirma tu suscripción.',
      confirm: { href: `/newsletter/confirmar?token=${'A'.repeat(43)}` },
    });
    const link = screen.getByTestId('newsletter-confirm-link');
    expect(link.getAttribute('href')).toBe(`/newsletter/confirmar?token=${'A'.repeat(43)}`);
    expect(link.textContent).toBe('Confirmar mi suscripción');
    expect(screen.getByTestId('newsletter-confirm').textContent).toContain('Sin correo propio');

    const trap = screen.getByTestId('newsletter-honeypot');
    expect(trap.hasAttribute('inert')).toBe(true);
    expect(trap.getAttribute('aria-hidden')).toBe('true');
    const field = trap.querySelector('input[name="website"]');
    expect(field?.getAttribute('tabindex')).toBe('-1');
    expect(field?.getAttribute('autocomplete')).toBe('off');
  });

  it('con éxito pero sin cupón (el servidor no pudo prepararlo) muestra solo el mensaje', async () => {
    await submitWith({ status: 'success', message: '¡Gracias por suscribirte! Te avisaremos de las novedades y ofertas.' });
    expect(screen.getByTestId('newsletter-message').textContent).toContain('¡Gracias por suscribirte!');
    expect(screen.queryByTestId('welcome-coupon')).toBeNull();
  });

  it('con un cupón caducado lo dice', async () => {
    await submitWith({ status: 'success', message: '¡Gracias!', coupon: { status: 'expired' } });
    expect(screen.getByTestId('welcome-coupon-expired')).toBeTruthy();
  });

  it('con un error no enseña ningún código', async () => {
    await submitWith({ status: 'error', message: 'No se ha podido completar la suscripción. Inténtalo de nuevo.' });
    expect(screen.queryByTestId('welcome-coupon')).toBeNull();
  });
});
