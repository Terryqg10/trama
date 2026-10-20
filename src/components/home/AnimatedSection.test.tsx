import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimatedSection, REVEAL_OFFSET_PX } from './AnimatedSection';

// CA-90 (nivel de componente). La animación real (fundido y subida al entrar en el viewport) y el caso sin
// JavaScript los comprueba el e2e `home-sections`.

// jsdom no trae IntersectionObserver (motion lo usa para detectar la entrada en el viewport).
class FakeIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnimatedSection (CA-90)', () => {
  it('siempre renderiza su contenido', () => {
    setReducedMotion(false);
    render(
      <AnimatedSection>
        <p>Contenido</p>
      </AnimatedSection>,
    );
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('con movimiento, parte oculta y 20 px más abajo (se marca con data-reveal)', () => {
    setReducedMotion(false);
    const { container } = render(
      <AnimatedSection>
        <p>Contenido</p>
      </AnimatedSection>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.hasAttribute('data-reveal')).toBe(true);
    expect(REVEAL_OFFSET_PX).toBe(20);
    expect(wrapper?.getAttribute('style')).toContain('opacity: 0');
    expect(wrapper?.getAttribute('style')).toContain('translateY(20px)');
  });

  it('con prefers-reduced-motion no se oculta ni se desplaza', () => {
    setReducedMotion(true);
    const { container } = render(
      <AnimatedSection className="x">
        <p>Contenido</p>
      </AnimatedSection>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.hasAttribute('data-reveal')).toBe(false);
    expect(wrapper?.getAttribute('style')).toBeNull();
    expect(wrapper?.className).toBe('x');
  });
});
