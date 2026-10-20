import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';
import { NewsletterSection } from './NewsletterSection';

// CA-101 (nivel de componente). El envío real y los mensajes tras la acción los comprueba el e2e `newsletter`.

vi.mock('@/app/actions/newsletter', () => ({ subscribeAction: vi.fn() }));

describe('NewsletterSection (CA-101)', () => {
  it('muestra tres propuestas de valor con icono, título y texto veraz', () => {
    render(<NewsletterSection />);
    const items = within(screen.getByTestId('value-props')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.querySelector('p')?.textContent)).toEqual(['MODA URBANA', 'ENVÍOS GRATIS', 'PAGO SEGURO']);
    for (const item of items) expect(item.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(items[1]?.textContent).toContain(`A partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}`);
    const all = screen.getByTestId('value-props').textContent ?? '';
    expect(all).not.toMatch(/1\.200|marcas|plazos|49,99/i);
  });

  it('el formulario tiene email, casilla de consentimiento sin marcar con enlace a /privacidad y «Suscribirme»', () => {
    render(<NewsletterSection />);
    const section = screen.getByTestId('newsletter');
    expect(within(section).getByRole('heading', { level: 2, name: '¡Entérate de todas las novedades y ofertas!' })).toBeTruthy();
    expect(within(section).getByLabelText('Email')).toBeTruthy();
    const consent = within(section).getByRole('checkbox');
    expect((consent as HTMLInputElement).checked).toBe(false);
    expect(within(section).getByRole('link', { name: 'política de privacidad' }).getAttribute('href')).toBe('/privacidad');
    expect(within(section).getByRole('button', { name: 'Suscribirme' })).toBeTruthy();
  });

  it('el mensaje se anuncia en una región aria-live="polite" que existe desde el principio', () => {
    render(<NewsletterSection />);
    expect(screen.getByTestId('newsletter-message').getAttribute('aria-live')).toBe('polite');
  });

  it('el fondo del bloque de newsletter usa el token surface-muted', () => {
    render(<NewsletterSection />);
    expect(screen.getByTestId('newsletter').className).toContain('bg-surface-muted');
  });
});
