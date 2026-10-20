import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DUAL_BANNER_MS, DualBannerSlider } from './DualBannerSlider';
import { DUAL_BANNER_SLIDES } from './dual-banner-slides';

// CA-112 y CA-113 (nivel de componente): estructura, enlaces, autoplay de 5 s, pausa y reduced-motion. El fundido real,
// el diseño por ancho y el contraste sobre las fotos los comprueba el e2e `dual-banner`.

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

function pointerOver(element: HTMLElement, pointerType: string) {
  // jsdom no trae PointerEvent: se le pone el tipo de puntero a mano.
  const event = new Event('pointerover', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(element, event);
}

const active = () => screen.getByTestId('dual-banner').getAttribute('data-active');

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DualBannerSlider: estructura (CA-112)', () => {
  it('tiene dos slides de dos tarjetas con subtítulo, título grande y botón con enlace', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    const slides = screen.getAllByTestId('dual-banner-slide');
    expect(slides).toHaveLength(2);
    for (const slide of slides) {
      const cards = within(slide).getAllByTestId('dual-banner-card');
      expect(cards).toHaveLength(2);
      for (const card of cards) {
        expect(card.querySelector('h3')?.textContent?.length).toBeGreaterThan(0);
        expect(card.querySelector('a')?.getAttribute('href')).toMatch(/^\/(hombre|mujer|novedades)/);
      }
    }
  });

  it('las cuatro tarjetas usan sus fotos y enlazan a rutas que existen', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    const links = Array.from(document.querySelectorAll('[data-testid="dual-banner-card"] a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/novedades', '/hombre?categoria=sudaderas', '/mujer?categoria=jerseis', '/novedades']);
    const images = Array.from(document.querySelectorAll('[data-testid="dual-banner-card"] img')).map((img) => img.getAttribute('alt'));
    expect(images).toEqual(['', '', '', '']);
  });

  it('el degradado y el texto usan tokens, sin valores arbitrarios ni negro', () => {
    const { container } = render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    const scrim = container.querySelector('[data-testid="dual-banner-card"] div[aria-hidden="true"]');
    expect(scrim?.className).toContain('from-fg/90');
    expect(container.innerHTML).not.toMatch(/bg-black|\[[0-9#][^\]]*\]/);
    expect(screen.getAllByTestId('dual-banner-text')[0]?.className).toContain('text-accent-fg');
  });

  it('el slide que no se ve es inert y la capa se funde con transition-opacity (sin transición con reduced-motion)', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    const [first, second] = screen.getAllByTestId('dual-banner-slide');
    expect(first?.hasAttribute('inert')).toBe(false);
    expect(second?.hasAttribute('inert')).toBe(true);
    expect(first?.className).toContain('opacity-100');
    expect(second?.className).toContain('opacity-0');
    expect(second?.className).toContain('transition-opacity');
    expect(second?.className).toContain('motion-reduce:transition-none');
    expect(first?.className).toContain('md:grid-cols-2');
  });

  it('es un carrusel con título accesible y slides con «1 de 2»', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Destacados de temporada', hidden: true })).toBeTruthy();
    expect(screen.getAllByRole('group', { hidden: true }).map((g) => g.getAttribute('aria-label'))).toEqual(['1 de 2', '2 de 2']);
  });
});

describe('DualBannerSlider: cambio automático (CA-113)', () => {
  it('pasa al siguiente slide a los 5 s y vuelve al primero', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    expect(active()).toBe('0');
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS - 1));
    expect(active()).toBe('0');
    act(() => vi.advanceTimersByTime(1));
    expect(active()).toBe('1');
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS));
    expect(active()).toBe('0');
  });

  it('los puntos eligen el slide y reinician la cuenta', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS - 100));
    fireEvent.click(screen.getByRole('button', { name: 'Ir al slide 2' }));
    expect(active()).toBe('1');
    expect(screen.getByRole('button', { name: 'Ir al slide 2' }).getAttribute('aria-current')).toBe('true');
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS - 100));
    expect(active()).toBe('1');
    act(() => vi.advanceTimersByTime(100));
    expect(active()).toBe('0');
  });

  it('el botón de pausa lo detiene y el de reanudar lo retoma', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar el cambio automático del banner' }));
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS * 3));
    expect(active()).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar el cambio automático del banner' }));
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS));
    expect(active()).toBe('1');
  });

  it('se detiene con el ratón encima, con el foco dentro, y un toque no lo detiene', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    const banner = screen.getByTestId('dual-banner');
    pointerOver(banner, 'mouse');
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS * 2));
    expect(active()).toBe('0');
    fireEvent.pointerOut(banner);
    const link = screen.getAllByRole('link')[0];
    if (!link) throw new Error('sin enlaces');
    fireEvent.focus(link);
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS * 2));
    expect(active()).toBe('0');
    fireEvent.blur(link, { relatedTarget: document.body });
    pointerOver(banner, 'touch');
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS));
    expect(active()).toBe('1');
  });

  it('con prefers-reduced-motion no cambia solo y no hay botón de pausa, pero los puntos funcionan', () => {
    setReducedMotion(true);
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    act(() => vi.advanceTimersByTime(DUAL_BANNER_MS * 4));
    expect(active()).toBe('0');
    expect(screen.queryByRole('button', { name: /cambio automático/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ir al slide 2' }));
    expect(active()).toBe('1');
  });

  it('los controles miden 44 px (size-11)', () => {
    render(<DualBannerSlider slides={DUAL_BANNER_SLIDES} />);
    for (const button of within(screen.getByTestId('dual-banner-controls')).getAllByRole('button')) {
      expect(button.className).toContain('size-11');
    }
  });
});
