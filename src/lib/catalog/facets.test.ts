import { describe, expect, it } from 'vitest';
import { capitalize, deriveFacets } from './facets';
import { catalogRowSchema, toCatalogProduct } from './product';

function product(overrides: Record<string, unknown>) {
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: 'p',
      slug: 'p',
      name: 'P',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: '2026-10-01T00:00:00Z',
      product_images: [],
      product_variants: [],
      ...overrides,
    }),
  );
}

const variant = (size: string, color: string, stock = 5) => ({
  id: `${size}-${color}`,
  size,
  color,
  price_cents: 1000,
  stock,
});

describe('deriveFacets', () => {
  it('ordena las tallas de letra antes que las numéricas', () => {
    const facets = deriveFacets([
      product({ product_variants: [variant('42', 'azul'), variant('L', 'azul'), variant('XS', 'azul'), variant('38', 'azul')] }),
    ]);
    expect(facets.sizes).toEqual(['XS', 'L', '38', '42']);
  });

  it('las tallas numéricas se ordenan como números, no como texto', () => {
    const facets = deriveFacets([
      product({ product_variants: [variant('100', 'azul'), variant('40', 'azul'), variant('9', 'azul')] }),
    ]);
    expect(facets.sizes).toEqual(['9', '40', '100']);
  });

  it('no ofrece tallas agotadas', () => {
    const facets = deriveFacets([
      product({ product_variants: [variant('S', 'azul', 0), variant('M', 'azul', 3)] }),
    ]);
    expect(facets.sizes).toEqual(['M']);
  });

  it('los colores no se repiten y van ordenados', () => {
    const facets = deriveFacets([
      product({ product_variants: [variant('S', 'negro'), variant('M', 'azul')] }),
      product({ id: 'q', product_variants: [variant('S', 'azul'), variant('M', 'burdeos')] }),
    ]);
    expect(facets.colors).toEqual(['azul', 'burdeos', 'negro']);
  });

  it('solo ofrece las categorías presentes, en orden canónico', () => {
    const facets = deriveFacets([
      product({ category: 'pantalones' }),
      product({ id: 'q', category: 'polos' }),
    ]);
    expect(facets.categories).toEqual(['polos', 'pantalones']);
  });

  it('un ámbito vacío no devuelve opciones', () => {
    expect(deriveFacets([])).toEqual({ categories: [], sizes: [], colors: [] });
  });
});

describe('capitalize', () => {
  it('pone la primera letra en mayúscula', () => {
    expect(capitalize('azul')).toBe('Azul');
    expect(capitalize('')).toBe('');
  });
});

describe('deriveFacets: nueve categorías (CA-79)', () => {
  it('ofrece solo las categorías presentes y en el orden canónico', () => {
    const facets = deriveFacets([
      product({ category: 'tops' }),
      product({ category: 'camisetas' }),
      product({ category: 'polos' }),
      product({ category: 'faldas' }),
      product({ category: 'sudaderas' }),
    ]);
    expect(facets.categories).toEqual(['polos', 'camisetas', 'sudaderas', 'faldas', 'tops']);
  });

  it('con las nueve presentes, las devuelve todas en el orden canónico', () => {
    const all = ['tops', 'faldas', 'chaquetas', 'sudaderas', 'camisetas', 'pantalones', 'blusas', 'camisas', 'polos'];
    const facets = deriveFacets(all.map((category) => product({ category })));
    expect(facets.categories).toEqual([
      'polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'faldas', 'tops',
    ]);
  });
});
