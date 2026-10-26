import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCROLL_TOP_THRESHOLD, ScrollToTop } from './ScrollToTop';

// CA-149 (nivel de componente): umbral, destino del clic y reduced-motion. El recorrido real en el navegador, el foco al
// logo y que no tape la barra de la ficha los comprueba el e2e `scroll-to-top`.

let pathname = '/hombre';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

const scrollToSpy = vi.fn();

beforeEach(() => {
  pathname = '/hombre';
  setReducedMotion(false);
  window.scrollTo = scrollToSpy;
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollToSpy.mockReset();
});

describe('ScrollToTop (CA-149)', () => {
  it('no existe arriba del todo y aparece al pasar el umbral', () => {
    render(<ScrollToTop />);
    expect(screen.queryByRole('button', { name: 'Volver arriba' })).toBeNull();
    scrollTo(SCROLL_TOP_THRESHOLD);
    expect(screen.queryByRole('button', { name: 'Volver arriba' })).toBeNull();
    scrollTo(SCROLL_TOP_THRESHOLD + 1);
    expect(screen.getByRole('button', { name: 'Volver arriba' })).toBeTruthy();
    scrollTo(0);
    expect(screen.queryByRole('button', { name: 'Volver arriba' })).toBeNull();
  });

  it('lleva arriba con desplazamiento suave', () => {
    render(<ScrollToTop />);
    scrollTo(900);
    fireEvent.click(screen.getByRole('button', { name: 'Volver arriba' }));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('con prefers-reduced-motion sube de golpe', () => {
    setReducedMotion(true);
    render(<ScrollToTop />);
    scrollTo(900);
    fireEvent.click(screen.getByRole('button', { name: 'Volver arriba' }));
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('en las fichas de producto se sube en móvil para no tapar la barra fija', () => {
    pathname = '/producto/polo-pique-basico';
    render(<ScrollToTop />);
    scrollTo(900);
    expect(screen.getByRole('button', { name: 'Volver arriba' }).className).toContain('bottom-24');
  });
});
