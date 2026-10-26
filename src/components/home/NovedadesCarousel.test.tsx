import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import { NovedadesCarousel } from './NovedadesCarousel';

// CA-146 (nivel de componente). Embla se sustituye por un doble: aquí se comprueba la estructura, las clases de ancho
// y las flechas; el desplazamiento real y los anchos medidos los comprueba el e2e `home-sections`.

const embla = vi.hoisted(() => {
  const api = {
    canScrollPrev: vi.fn(() => false),
    canScrollNext: vi.fn(() => true),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  api.on.mockReturnValue(api);
  api.off.mockReturnValue(api);
  return api;
});

vi.mock('embla-carousel-react', () => ({ default: () => [() => undefined, embla] }));

function product(index: number) {
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: `p${index}`,
      slug: `producto-${index}`,
      name: `Producto ${index}`,
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: true,
      created_at: '2026-10-01T00:00:00Z',
      product_images: [],
      product_variants: [{ id: `v${index}`, size: 'M', color: 'negro', price_cents: 2990, stock: 5 }],
    }),
  );
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

beforeEach(() => setReducedMotion(false));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  embla.canScrollPrev.mockReturnValue(false);
  embla.canScrollNext.mockReturnValue(true);
  embla.on.mockReturnValue(embla);
  embla.off.mockReturnValue(embla);
});

describe('NovedadesCarousel (CA-146)', () => {
  const products = [product(1), product(2), product(3), product(4), product(5)];

  it('mantiene el título, «Ver todo» a /novedades y una tarjeta completa por producto', () => {
    render(<NovedadesCarousel products={products} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Novedades' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver todo' }).getAttribute('href')).toBe('/novedades');
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('muestra 4 / 2,5 / 1,2 tarjetas con anchos de fracción y separación de 1,5 rem sin valores arbitrarios', () => {
    render(<NovedadesCarousel products={products} />);
    const slide = screen.getAllByTestId('novedades-slide')[0];
    expect(slide?.className).toContain('basis-5/6');
    expect(slide?.className).toContain('md:basis-2/5');
    expect(slide?.className).toContain('lg:basis-1/4');
    expect(slide?.className).toContain('pl-6');
    expect(screen.getAllByRole('list')[0]?.className).toContain('-ml-6');
    expect(screen.getByTestId('novedades-viewport').className).toContain('overflow-hidden');
  });

  it('las flechas se desactivan en los extremos y desplazan el carrusel', () => {
    render(<NovedadesCarousel products={products} />);
    const prev = screen.getByRole('button', { name: 'Novedades anteriores' });
    const next = screen.getByRole('button', { name: 'Novedades siguientes' });
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    expect((next as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(next);
    expect(embla.scrollNext).toHaveBeenCalledWith(false);
  });

  it('con prefers-reduced-motion las flechas saltan sin animación', () => {
    setReducedMotion(true);
    render(<NovedadesCarousel products={products} />);
    fireEvent.click(screen.getByRole('button', { name: 'Novedades siguientes' }));
    expect(embla.scrollNext).toHaveBeenCalledWith(true);
  });
});
