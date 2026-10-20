import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HERO_SLIDES } from '../home/hero-slides';
import { AUTOPLAY_MS, HeroSlider } from './HeroSlider';

// CA-86, CA-87 y CA-88 (nivel de componente). Embla se sustituye por un doble: aquí se comprueba la estructura, los
// controles y la lógica del autoplay; el arrastre y el cambio real de slide los comprueba el e2e `home-hero`.

const embla = vi.hoisted(() => {
  const api = {
    selectedScrollSnap: vi.fn(() => 0),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    scrollTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  api.on.mockReturnValue(api);
  api.off.mockReturnValue(api);
  return api;
});

vi.mock('embla-carousel-react', () => ({ default: () => [() => undefined, embla] }));

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

// jsdom no trae PointerEvent: se le pone el tipo de puntero a mano.
function pointerEnter(element: HTMLElement, pointerType: string) {
  const event = createEvent.pointerOver(element);
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(element, event);
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  embla.on.mockReturnValue(embla);
  embla.off.mockReturnValue(embla);
});

describe('HeroSlider: estructura (CA-86)', () => {
  it('muestra tres slides con titular, subtítulo y un enlace válido cada una', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    const slides = document.querySelectorAll('[data-testid="hero-slide"]');
    expect(slides).toHaveLength(3);
    const links = Array.from(slides).map((slide) => {
      const link = slide.querySelector('a');
      return [slide.querySelector('h1, h2')?.textContent, link?.getAttribute('href')];
    });
    expect(links).toEqual([
      ['Nueva colección', '/novedades'],
      ['Estilo urbano', '/hombre'],
      ['Kawaii style', '/mujer'],
    ]);
    for (const slide of HERO_SLIDES) {
      expect(slide.subtitle.trim().length).toBeGreaterThan(0);
      expect(slide.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it('tiene un único h1 (la primera slide); las demás son h2', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    expect(screen.getAllByRole('heading', { level: 1, hidden: true })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2, hidden: true })).toHaveLength(2);
  });

  it('la primera slide usa foto vertical por defecto y horizontal desde 768 px, en AVIF con WebP de respaldo', () => {
    const { container } = render(<HeroSlider slides={HERO_SLIDES} />);
    const first = container.querySelector('[data-testid="hero-slide"] picture');
    const sources = Array.from(first?.querySelectorAll('source') ?? []).map((s) => [
      s.getAttribute('media'),
      s.getAttribute('type'),
      s.getAttribute('srcset'),
    ]);
    expect(sources).toEqual([
      ['(min-width: 768px)', 'image/avif', '/images/hero/hero-coleccion.avif'],
      ['(min-width: 768px)', 'image/webp', '/images/hero/hero-coleccion.webp'],
      [null, 'image/avif', '/images/hero/hero-coleccion-movil.avif'],
      [null, 'image/webp', '/images/hero/hero-coleccion-movil.webp'],
    ]);
    expect(first?.querySelector('img')?.getAttribute('src')).toBe('/images/hero/hero-coleccion-movil.webp');
  });

  it('solo la primera imagen (LCP) carga con prioridad; el resto, en diferido', () => {
    const { container } = render(<HeroSlider slides={HERO_SLIDES} />);
    const images = Array.from(container.querySelectorAll('picture img'));
    expect(images.map((img) => img.getAttribute('loading'))).toEqual(['eager', 'lazy', 'lazy']);
    expect(images[0]?.getAttribute('fetchpriority')).toBe('high');
  });

  it('el degradado usa tokens (fg) y no valores arbitrarios', () => {
    const { container } = render(<HeroSlider slides={HERO_SLIDES} />);
    const gradient = container.querySelector('[data-testid="hero-slide"] div[aria-hidden="true"]');
    expect(gradient?.className).toContain('from-fg/85');
    expect(gradient?.className).not.toContain('black');
    expect(gradient?.className).not.toMatch(/\[[^\]]+\]/);
  });
});

describe('HeroSlider: controles (CA-87)', () => {
  it('las slides no visibles son inert (sin foco) y la visible no', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    const slides = Array.from(document.querySelectorAll('[data-testid="hero-slide"]'));
    expect(slides.map((s) => s.hasAttribute('inert'))).toEqual([false, true, true]);
  });

  it('flechas y puntos tienen nombre accesible y el punto activo lo indica con aria-current', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    const controls = within(screen.getByTestId('hero-controls'));
    expect(controls.getByRole('button', { name: 'Slide anterior' })).toBeTruthy();
    expect(controls.getByRole('button', { name: 'Slide siguiente' })).toBeTruthy();
    const dots = controls.getAllByRole('button', { name: /^Ir a la slide/ });
    expect(dots).toHaveLength(3);
    expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual(['true', null, null]);
  });

  it('flechas y puntos mandan al slider a su slide', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Slide siguiente' }));
    expect(embla.scrollNext).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Slide anterior' }));
    expect(embla.scrollPrev).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: /^Ir a la slide 3/ }));
    expect(embla.scrollTo).toHaveBeenCalledWith(2, false);
  });

  it('los controles miden al menos 44 × 44 px (size-11)', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    for (const button of within(screen.getByTestId('hero-controls')).getAllByRole('button')) {
      expect(button.className).toContain('size-11');
    }
  });
});

describe('HeroSlider: autoplay (CA-88)', () => {
  it('avanza una slide cada 5 s', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS - 1));
    expect(embla.scrollNext).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(embla.scrollNext).toHaveBeenCalledTimes(2);
  });

  it('el botón de pausa lo detiene y el de reanudar lo reactiva', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar el cambio automático' }));
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS * 3));
    expect(embla.scrollNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar el cambio automático' }));
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('se detiene con el ratón encima y se reanuda al salir', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    const slider = screen.getByTestId('hero-slider');
    pointerEnter(slider, 'mouse');
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS * 2));
    expect(embla.scrollNext).not.toHaveBeenCalled();
    fireEvent.pointerOut(slider);
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('un toque (puntero táctil) no lo detiene', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    pointerEnter(screen.getByTestId('hero-slider'), 'touch');
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('se detiene con el foco dentro y se reanuda al sacarlo', () => {
    render(<HeroSlider slides={HERO_SLIDES} />);
    const cta = screen.getByRole('link', { name: 'Ver colección' });
    fireEvent.focus(cta);
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS * 2));
    expect(embla.scrollNext).not.toHaveBeenCalled();
    fireEvent.blur(cta, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('con prefers-reduced-motion no hay autoplay, ni botón de pausa, y los cambios son saltos directos', () => {
    setReducedMotion(true);
    render(<HeroSlider slides={HERO_SLIDES} />);
    act(() => vi.advanceTimersByTime(AUTOPLAY_MS * 4));
    expect(embla.scrollNext).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /cambio automático/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Slide siguiente' }));
    expect(embla.scrollNext).toHaveBeenCalledWith(true);
  });
});
