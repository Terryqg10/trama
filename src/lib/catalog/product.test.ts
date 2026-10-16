import { describe, expect, it } from 'vitest';
import {
  catalogRowSchema,
  sortProducts,
  toCatalogProduct,
  type CatalogProduct,
} from './product';

function row(overrides: Record<string, unknown> = {}) {
  return catalogRowSchema.parse({
    id: 'p1',
    slug: 'polo-demo',
    name: 'Polo demo',
    gender: 'hombre',
    category: 'polos',
    occasion: 'casual',
    is_new: false,
    created_at: '2026-10-01T10:00:00Z',
    product_images: [
      { path: '/products/polos-azul.svg', alt: 'Polo, color azul', position: 1 },
      { path: '/products/polos-blanco.svg', alt: 'Polo, color blanco', position: 0 },
    ],
    product_variants: [
      { id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 5 },
      { id: 'v2', size: 'L', color: 'azul', price_cents: 3490, stock: 0 },
      { id: 'v3', size: 'M', color: 'blanco', price_cents: 3190, stock: 2 },
    ],
    ...overrides,
  });
}

function product(overrides: Partial<CatalogProduct>): CatalogProduct {
  return { ...toCatalogProduct(row()), ...overrides };
}

describe('toCatalogProduct', () => {
  it('el precio "desde" es el menor de las variantes', () => {
    expect(toCatalogProduct(row()).fromPriceCents).toBe(2990);
  });

  it('ordena las imágenes por posición', () => {
    expect(toCatalogProduct(row()).images.map((i) => i.path)).toEqual([
      '/products/polos-blanco.svg',
      '/products/polos-azul.svg',
    ]);
  });

  it('solo lista las tallas con stock (CA-03, CA-27)', () => {
    expect(toCatalogProduct(row()).sizes).toEqual(['M']);
  });

  it('los colores no se repiten', () => {
    expect(toCatalogProduct(row()).colors).toEqual(['azul', 'blanco']);
  });

  it('inStock es falso si todas las variantes están agotadas', () => {
    const soldOut = row({
      product_variants: [{ id: 'v1', size: 'M', color: 'azul', price_cents: 2990, stock: 0 }],
    });
    expect(toCatalogProduct(soldOut).inStock).toBe(false);
    expect(toCatalogProduct(soldOut).sizes).toEqual([]);
  });

  it('sin variantes: precio 0 y sin stock, sin romper', () => {
    const empty = toCatalogProduct(row({ product_variants: [] }));
    expect(empty.fromPriceCents).toBe(0);
    expect(empty.inStock).toBe(false);
  });
});

describe('catalogRowSchema', () => {
  it('rechaza una ocasión desconocida', () => {
    expect(() => row({ occasion: 'playa' })).toThrow();
  });

  it('rechaza un precio con decimales', () => {
    expect(() =>
      row({ product_variants: [{ id: 'v1', size: 'M', color: 'azul', price_cents: 10.5, stock: 1 }] }),
    ).toThrow();
  });

  it('rechaza una imagen fuera de /products/', () => {
    expect(() =>
      row({ product_images: [{ path: 'https://evil.example/x.svg', alt: 'x', position: 0 }] }),
    ).toThrow();
  });
});

describe('sortProducts', () => {
  const barato = product({ id: 'a', name: 'Barato', fromPriceCents: 1000 });
  const medio = product({ id: 'b', name: 'Medio', fromPriceCents: 3000 });
  const caro = product({ id: 'c', name: 'Caro', fromPriceCents: 9000 });

  it('precio ascendente', () => {
    expect(sortProducts([caro, barato, medio], 'precio-asc').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('precio descendente', () => {
    expect(sortProducts([barato, caro, medio], 'precio-desc').map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('novedades: primero los nuevos, luego los más recientes', () => {
    const viejo = product({ id: 'viejo', name: 'Viejo', isNew: false, createdAt: '2026-01-01T00:00:00Z' });
    const reciente = product({ id: 'reciente', name: 'Reciente', isNew: false, createdAt: '2026-09-01T00:00:00Z' });
    const nuevo = product({ id: 'nuevo', name: 'Nuevo', isNew: true, createdAt: '2026-02-01T00:00:00Z' });
    expect(sortProducts([viejo, reciente, nuevo], 'novedades').map((p) => p.id)).toEqual([
      'nuevo',
      'reciente',
      'viejo',
    ]);
  });

  it('los empates se resuelven por nombre', () => {
    const a = product({ id: 'a', name: 'Alfa', fromPriceCents: 1000 });
    const z = product({ id: 'z', name: 'Zeta', fromPriceCents: 1000 });
    expect(sortProducts([z, a], 'precio-asc').map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('no modifica la lista original', () => {
    const original = [caro, barato];
    sortProducts(original, 'precio-asc');
    expect(original.map((p) => p.id)).toEqual(['c', 'a']);
  });
});
