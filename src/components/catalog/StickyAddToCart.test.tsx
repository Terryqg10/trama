import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StickyAddToCart } from './StickyAddToCart';

// CA-72 (nivel de componente): la barra aparece cuando el botón original sale de pantalla y se oculta cuando
// vuelve a verse. El cambio real por ancho, el carrito y el movimiento los comprueba el e2e `sticky-add-to-cart`.

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

describe('StickyAddToCart (CA-72)', () => {
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

  it('solo se muestra en móvil y la transición respeta prefers-reduced-motion', () => {
    renderBar();
    const classes = screen.getByTestId('sticky-add-to-cart').className;
    expect(classes).toContain('md:hidden');
    expect(classes).toContain('motion-safe:transition');
    expect(classes).not.toMatch(/(^|\s)transition(\s|$)/);
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
