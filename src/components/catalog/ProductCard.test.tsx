import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import { ProductCard } from './ProductCard';

function product(overrides: Record<string, unknown> = {}) {
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: 'p1',
      slug: 'polo-demo',
      name: 'Polo demo',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: '2026-10-01T00:00:00Z',
      product_images: [{ path: '/products/polos-azul.svg', alt: 'Polo demo, color azul', position: 0 }],
      product_variants: [
        { id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 5 },
        { id: 'v2', size: 'L', color: 'blanco', price_cents: 2990, stock: 3 },
      ],
      ...overrides,
    }),
  );
}

const normalize = (value: string | null) => (value ?? '').replace(/ /g, ' ');

describe('ProductCard', () => {
  it('muestra nombre, precio en euros y número de colores', () => {
    render(<ProductCard product={product()} />);
    expect(screen.getByRole('heading', { name: 'Polo demo' })).toBeInTheDocument();
    expect(normalize(screen.getByText(/29,90/).textContent)).toBe('29,90 €');
    expect(screen.getByText('2 colores')).toBeInTheDocument();
  });

  it('la imagen lleva el texto alternativo de la BD', () => {
    render(<ProductCard product={product()} />);
    expect(screen.getByAltText('Polo demo, color azul')).toBeInTheDocument();
  });

  it('muestra "Desde" cuando las variantes tienen precios distintos', () => {
    const withRange = product({
      product_variants: [
        { id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 5 },
        { id: 'v2', size: 'L', color: 'azul', price_cents: 3490, stock: 5 },
      ],
    });
    render(<ProductCard product={withRange} />);
    expect(normalize(screen.getByText(/Desde/).textContent)).toBe('Desde 29,90 €');
  });

  it('muestra la insignia "Nuevo" solo en productos nuevos', () => {
    const { rerender } = render(<ProductCard product={product()} />);
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
    rerender(<ProductCard product={product({ is_new: true })} />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('muestra "Agotado" como texto cuando todas las variantes están sin stock', () => {
    const soldOut = product({
      product_variants: [{ id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 0 }],
    });
    render(<ProductCard product={soldOut} />);
    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });

  it('no muestra "Agotado" si hay alguna variante con stock', () => {
    render(<ProductCard product={product()} />);
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument();
  });

  it('no es un enlace ni tiene botones (la ficha llega en T-005b)', () => {
    render(<ProductCard product={product()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sin imágenes muestra un texto en lugar de una imagen rota', () => {
    render(<ProductCard product={product({ product_images: [] })} />);
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
  });
});
