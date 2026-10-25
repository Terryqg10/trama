import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MobileAppSection } from './MobileAppSection';

// CA-14 y CA-15 (T-106, nivel de componente): sección, aviso de demostración y diálogo. Anchos, foco real y portada estática
// los comprueban los e2e `mobile-app`.

afterEach(cleanup);

describe('MobileAppSection', () => {
  it('lleva el titular, el aviso de demostración como nota y dos botones de tienda', () => {
    render(<MobileAppSection />);
    expect(screen.getByRole('heading', { level: 2, name: 'Trama en tu móvil' })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toBe('Trama es un proyecto de demostración: no existe una app real.');
    expect(screen.getAllByTestId('store-button').map((b) => b.textContent)).toEqual(['App Store', 'Google Play']);
    expect(screen.getByTestId('phone-mockup').getAttribute('aria-hidden')).toBe('true');
  });

  it('no hay enlaces a tiendas ni destinos vacíos: solo botones', () => {
    const { container } = render(<MobileAppSection />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelector('[href="#"]')).toBeNull();
  });

  it('un botón abre el diálogo «App no disponible» con enlace a Novedades; Esc, X y fondo lo cierran', () => {
    render(<MobileAppSection />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByTestId('store-button')[0] as HTMLElement);
    const dialog = screen.getByRole('dialog', { name: 'App no disponible' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('link', { name: 'Ver novedades' }).getAttribute('href')).toBe('/novedades');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByTestId('store-button')[1] as HTMLElement);
    fireEvent.click(screen.getByTestId('app-dialog-close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getAllByTestId('store-button')[0] as HTMLElement);
    fireEvent.click(screen.getByTestId('app-dialog-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
