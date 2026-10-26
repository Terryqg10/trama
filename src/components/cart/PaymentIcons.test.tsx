import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_PAYMENT_NOTICE, PaymentIcons } from './PaymentIcons';

// CA-150 (nivel de componente): los cinco métodos, con nombre accesible y trazado de `simple-icons`, y el aviso de demostración.

afterEach(cleanup);

describe('PaymentIcons (CA-150)', () => {
  it('muestra Visa, Mastercard, PayPal, Apple Pay y Google Pay con su nombre accesible y un trazado', () => {
    const { container } = render(<PaymentIcons />);
    const list = screen.getByRole('list', { name: 'Métodos de pago' });
    const names = within(list)
      .getAllByRole('img')
      .map((icon) => icon.getAttribute('aria-label'));
    expect(names).toEqual(['Visa', 'MasterCard', 'PayPal', 'Apple Pay', 'Google Pay']);
    for (const path of container.querySelectorAll('svg path')) {
      expect((path.getAttribute('d') ?? '').length).toBeGreaterThan(50);
    }
  });

  it('dice que es un entorno de demostración y no promete «pago seguro» ni «cifrado»', () => {
    const { container } = render(<PaymentIcons />);
    expect(screen.getByText('Entorno de demostración. No se realizarán cargos reales.')).toBeTruthy();
    expect(DEMO_PAYMENT_NOTICE).toBe('Entorno de demostración. No se realizarán cargos reales.');
    expect(container.textContent?.toLowerCase()).not.toMatch(/cifrad|pago seguro/);
  });

  it('no usa colores de marca: pinta con currentColor', () => {
    const { container } = render(<PaymentIcons />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
    for (const svg of container.querySelectorAll('svg')) expect(svg.getAttribute('class')).toContain('fill-current');
  });
});
