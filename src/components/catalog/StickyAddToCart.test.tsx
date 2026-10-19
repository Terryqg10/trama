import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StickyAddToCart } from './StickyAddToCart';

// CA-72, CA-73 y CA-74 (nivel de componente): la barra aparece cuando el botón original sale de pantalla y se oculta
// cuando vuelve a verse, con un desvanecimiento, y «Volver arriba» aparece tras mucho scroll. El cambio real por
// ancho, el carrito y el movimiento los comprueban los e2e `sticky-add-to-cart` y `sticky-back-to-top`.

vi.mock('@/components/cart/AddToCartButton', () => ({
  AddToCartButton: ({ testId, productName, variantId }: { testId?: string; productName: string; variantId: string | null }) => (
    <button type="button" data-testid={testId ?? 'add-to-cart'} data-variant={variantId ?? ''}>
      Añadir {productName}
    </button>
  ),
}));

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let callback: ObserverCallback | null = null;
let observed: Element | null = null;
let observerOptions: IntersectionObserverInit | undefined;
let disconnected = false;

class FakeIntersectionObserver {
  constructor(cb: ObserverCallback, options?: IntersectionObserverInit) {
    callback = cb;
    observerOptions = options;
  }
  observe(element: Element) {
    observed = element;
  }
  disconnect() {
    disconnected = true;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function setIntersecting(isIntersecting: boolean) {
  act(() => {
    callback?.([{ isIntersecting } as IntersectionObserverEntry]);
  });
}

function renderBar() {
  return render(
    <>
      <div id="add-to-cart-anchor" />
      <StickyAddToCart
        targetId="add-to-cart-anchor"
        name="Camisa oxford de algodón"
        priceLabel="44,90 €"
        variantId="variant-1"
        stock={3}
        signedIn={false}
      />
    </>,
  );
}

beforeEach(() => {
  callback = null;
  observed = null;
  observerOptions = undefined;
  disconnected = false;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StickyAddToCart (CA-72, CA-73)', () => {
  it('empieza oculta, inerte y fuera del árbol de accesibilidad', () => {
    renderBar();
    const bar = screen.getByTestId('sticky-add-to-cart');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.hasAttribute('inert')).toBe(true);
  });

  it('observa el botón original con el margen de 100 px por abajo', () => {
    const { container } = renderBar();
    expect(observed).toBe(container.querySelector('#add-to-cart-anchor'));
    expect(observerOptions?.rootMargin).toBe('0px 0px -100px 0px');
  });

  it('aparece cuando el botón original sale de pantalla y se oculta cuando vuelve a verse', () => {
    renderBar();
    const bar = screen.getByTestId('sticky-add-to-cart');

    setIntersecting(false);
    expect(bar.getAttribute('aria-hidden')).toBe('false');
    expect(bar.hasAttribute('inert')).toBe(false);

    setIntersecting(true);
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.hasAttribute('inert')).toBe(true);
  });

  it('solo se muestra en móvil y se desvanece (solo opacidad, sin desplazamiento) respetando prefers-reduced-motion', () => {
    renderBar();
    const bar = screen.getByTestId('sticky-add-to-cart');
    expect(bar.className).toContain('md:hidden');
    expect(bar.className).toContain('motion-safe:transition-opacity');
    expect(bar.className).not.toMatch(/(^|\s)transition/);
    expect(bar.className).not.toContain('translate');

    setIntersecting(false);
    expect(bar.className).toContain('opacity-100');
    setIntersecting(true);
    expect(bar.className).toContain('opacity-0');
  });

  it('enseña el nombre y el precio, y reutiliza el botón con otro data-testid para no duplicar el del original', () => {
    renderBar();
    const bar = screen.getByTestId('sticky-add-to-cart');
    expect(bar.textContent).toContain('Camisa oxford de algodón');
    expect(bar.textContent).toContain('44,90 €');
    const button = screen.getByTestId('add-to-cart-sticky');
    expect(button.getAttribute('data-variant')).toBe('variant-1');
    expect(screen.queryByTestId('add-to-cart')).toBeNull();
  });

  it('deja de observar al desmontarse', () => {
    const { unmount } = renderBar();
    unmount();
    expect(disconnected).toBe(true);
  });
});

describe('«Volver arriba» (CA-74)', () => {
  const scrollTo = vi.fn();

  function scrollTop(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    act(() => {
      fireEvent.scroll(window);
    });
  }

  function stubReducedMotion(reduced: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query.includes('reduce'), media: query }));
  }

  beforeEach(() => {
    scrollTo.mockClear();
    vi.stubGlobal('scrollTo', scrollTo);
    stubReducedMotion(false);
  });

  it('está oculto arriba y aparece al bajar más de pantalla y media', () => {
    renderBar();
    const button = screen.getByTestId('back-to-top');
    scrollTop(0);
    expect(button.getAttribute('aria-hidden')).toBe('true');
    expect(button.hasAttribute('inert')).toBe(true);

    scrollTop(1200); // exactamente 1,5 × 800: todavía no
    expect(button.getAttribute('aria-hidden')).toBe('true');

    scrollTop(1201);
    expect(button.getAttribute('aria-hidden')).toBe('false');
    expect(button.hasAttribute('inert')).toBe(false);

    scrollTop(0);
    expect(button.getAttribute('aria-hidden')).toBe('true');
  });

  it('tiene nombre accesible, un icono decorativo y se desvanece sin desplazarse', () => {
    renderBar();
    const button = screen.getByTestId('back-to-top');
    expect(button.getAttribute('aria-label')).toBe('Volver arriba');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.className).toContain('motion-safe:transition-opacity');
    expect(button.className).not.toContain('translate');
  });

  it('lleva al inicio con desplazamiento suave', () => {
    renderBar();
    scrollTop(2000);
    fireEvent.click(screen.getByTestId('back-to-top'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('con prefers-reduced-motion el desplazamiento es instantáneo', () => {
    stubReducedMotion(true);
    renderBar();
    scrollTop(2000);
    fireEvent.click(screen.getByTestId('back-to-top'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('deja de escuchar el scroll al desmontarse', () => {
    const { unmount } = renderBar();
    const remove = vi.spyOn(window, 'removeEventListener');
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    remove.mockRestore();
  });
});
