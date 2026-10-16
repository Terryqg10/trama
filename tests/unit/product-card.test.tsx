import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCard } from '@/components/catalog/ProductCard';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';

// SPEC-001 Enmienda 8 / T-015: la imagen LCP del listado se carga con prioridad (CA-53).

function product() {
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
      product_variants: [{ id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 5 }],
    }),
  );
}

describe('ProductCard: prioridad de la imagen (CA-53)', () => {
  it('con priority, la imagen lleva fetchpriority="high" y no se carga en diferido', () => {
    render(<ProductCard product={product()} priority />);
    const image = screen.getByRole('img', { name: 'Polo demo, color azul' });
    expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(image.getAttribute('loading')).not.toBe('lazy');
  });

  it('sin priority, la imagen se carga en diferido y sin prioridad alta', () => {
    render(<ProductCard product={product()} />);
    const image = screen.getByRole('img', { name: 'Polo demo, color azul' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.getAttribute('fetchpriority')).not.toBe('high');
  });

  it('con priority={false} se comporta como sin priority', () => {
    render(<ProductCard product={product()} priority={false} />);
    const image = screen.getByRole('img', { name: 'Polo demo, color azul' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.getAttribute('fetchpriority')).not.toBe('high');
  });
});
