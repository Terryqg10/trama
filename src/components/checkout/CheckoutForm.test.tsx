import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// CA-140 (T-091, nivel de componente): el aviso de demostración del pago. El envío real lo comprueba el e2e `checkout`.

vi.mock('@/lib/checkout/actions', () => ({ startCheckoutAction: vi.fn() }));

import { DEMO_TEST_CARD } from '@/lib/demo';
import { CheckoutForm, type CheckoutAddress } from './CheckoutForm';

const ADDRESS: CheckoutAddress = {
  id: '11111111-1111-4111-8111-111111111111',
  recipientName: 'Ana Pérez',
  line1: 'Calle Mayor 1',
  line2: null,
  postalCode: '28001',
  city: 'Madrid',
  province: 'Madrid',
};

afterEach(cleanup);

describe('CheckoutForm: aviso de demostración (CA-140)', () => {
  it('con dirección enseña la tarjeta de prueba, fecha y CVC cualquiera, y un botón de copiar, dentro del formulario y después del botón de pago', () => {
    const { container } = render(<CheckoutForm addresses={[ADDRESS]} disabled={false} />);
    const note = screen.getByTestId('demo-notice-checkout');
    expect(note.getAttribute('role')).toBe('note');
    expect(screen.getByTestId('demo-card-number').textContent).toBe(DEMO_TEST_CARD);
    expect(DEMO_TEST_CARD).toBe('4242 4242 4242 4242');
    expect(note.textContent).toContain('cualquier fecha futura');
    expect(note.textContent).toContain('cualquier CVC');
    expect(screen.getByRole('button', { name: 'Copiar número' })).toBeTruthy();
    const form = container.querySelector('form');
    expect(form?.contains(note)).toBe(true);
    const pay = screen.getByRole('button', { name: 'Pagar con tarjeta' });
    expect(pay.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('el botón de copiar no envía el formulario (es de tipo button)', () => {
    render(<CheckoutForm addresses={[ADDRESS]} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Copiar número' }).getAttribute('type')).toBe('button');
  });

  it('con el pago deshabilitado por avisos del carrito, el aviso sigue ahí', () => {
    render(<CheckoutForm addresses={[ADDRESS]} disabled />);
    expect(screen.queryByRole('button', { name: 'Pagar con tarjeta' })).toBeNull();
    expect(screen.getByTestId('demo-notice-checkout')).toBeTruthy();
  });

  it('sin dirección no hay formulario de pago, así que no se muestra el aviso', () => {
    render(<CheckoutForm addresses={[]} disabled={false} />);
    expect(screen.queryByTestId('demo-notice-checkout')).toBeNull();
  });
});
