import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewsletterSection } from './NewsletterSection';

// CA-101 y CA-111 (nivel de componente). El envío real y los mensajes tras la acción los comprueba el e2e `newsletter`.

vi.mock('@/app/actions/newsletter', () => ({ subscribeAction: vi.fn() }));

describe('NewsletterSection (CA-101)', () => {
  it('ya no muestra las tres propuestas de valor (pasaron a la sección de confianza)', () => {
    render(<NewsletterSection />);
    expect(screen.queryByTestId('value-props')).toBeNull();
    expect(screen.queryByText('MODA URBANA')).toBeNull();
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

  it('el fondo es un degradado diagonal con el acento y solo tokens (CA-144)', () => {
    render(<NewsletterSection />);
    const classes = screen.getByTestId('newsletter').className;
    expect(classes).toContain('bg-linear-to-br');
    expect(classes).toContain('from-accent/10');
    expect(classes).toContain('via-surface');
    expect(classes).toContain('to-surface');
    expect(classes).not.toContain('bg-surface-muted');
    expect(classes).not.toMatch(/#|black|\[(?!--)[^\]]+\]/);
  });
});
