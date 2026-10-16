import { describe, expect, it } from 'vitest';
import { productDetailRowSchema, toProductDetail, type ProductDetail } from './product';
import { imageForColor, resolveSelection } from './variant-selection';

// Producto de ejemplo: polo en azul y negro; la talla XL negra está agotada y todo el azul tiene
// la talla S agotada.
function product(overrides: Record<string, unknown> = {}): ProductDetail {
  const variant = (id: string, size: string, color: string, stock: number) => ({
    id,
    size,
    color,
    price_cents: 2990,
    stock,
  });
  return toProductDetail(
    productDetailRowSchema.parse({
      id: 'p1',
      slug: 'polo-demo',
      name: 'Polo demo',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: '2026-10-01T00:00:00Z',
      description: 'Polo de ejemplo.',
      composition: null,
      care: null,
      model_height_cm: null,
      model_size: null,
      product_images: [
        { path: '/products/polos-azul.svg', alt: 'Polo demo, color azul', position: 0 },
        { path: '/products/polos-negro.svg', alt: 'Polo demo, color negro', position: 1 },
      ],
      product_variants: [
        variant('v1', 'S', 'azul', 0),
        variant('v2', 'M', 'azul', 5),
        variant('v3', 'L', 'azul', 5),
        variant('v4', 'XL', 'negro', 0),
        variant('v5', 'M', 'negro', 5),
        variant('v6', 'S', 'negro', 5),
      ],
      ...overrides,
    }),
  );
}

describe('resolveSelection: color', () => {
  it('sin parámetros elige el primer color con stock', () => {
    expect(resolveSelection(product(), {}).color).toBe('azul');
  });

  it('si el primer color está agotado, elige el siguiente con stock', () => {
    const soldOutBlue = product({
      product_variants: [
        { id: 'a', size: 'M', color: 'azul', price_cents: 2990, stock: 0 },
        { id: 'b', size: 'M', color: 'negro', price_cents: 2990, stock: 3 },
      ],
    });
    expect(resolveSelection(soldOutBlue, {}).color).toBe('negro');
  });

  it('respeta el color pedido y lo normaliza a minúsculas', () => {
    expect(resolveSelection(product(), { color: 'NEGRO' }).color).toBe('negro');
  });

  it('un color que el producto no tiene se ignora', () => {
    expect(resolveSelection(product(), { color: 'rojo' }).color).toBe('azul');
  });

  it('un color con caracteres raros se ignora', () => {
    expect(resolveSelection(product(), { color: 'azul<script>' }).color).toBe('azul');
  });

  it('un parámetro repetido se ignora', () => {
    expect(resolveSelection(product(), { color: ['negro', 'azul'] }).color).toBe('azul');
  });
});

describe('resolveSelection: tallas', () => {
  it('lista solo las tallas del color elegido, ordenadas', () => {
    const azul = resolveSelection(product(), { color: 'azul' });
    expect(azul.sizes.map((s) => s.size)).toEqual(['S', 'M', 'L']);
    const negro = resolveSelection(product(), { color: 'negro' });
    expect(negro.sizes.map((s) => s.size)).toEqual(['S', 'M', 'XL']);
  });

  it('marca como no disponibles las tallas sin stock (CA-03)', () => {
    const azul = resolveSelection(product(), { color: 'azul' });
    expect(azul.sizes.find((s) => s.size === 'S')?.available).toBe(false);
    expect(azul.sizes.find((s) => s.size === 'M')?.available).toBe(true);
  });

  it('sin talla en la URL no hay talla ni variante elegidas', () => {
    const selection = resolveSelection(product(), {});
    expect(selection.size).toBeNull();
    expect(selection.variant).toBeNull();
  });

  it('elige la talla pedida si hay stock y devuelve su variante', () => {
    const selection = resolveSelection(product(), { color: 'azul', talla: 'm' });
    expect(selection.size).toBe('M');
    expect(selection.variant?.id).toBe('v2');
  });

  it('una talla sin stock no se puede elegir y se ignora (CA-03)', () => {
    const selection = resolveSelection(product(), { color: 'azul', talla: 'S' });
    expect(selection.size).toBeNull();
    expect(selection.variant).toBeNull();
  });

  it('una talla que no existe en ese color se ignora', () => {
    expect(resolveSelection(product(), { color: 'azul', talla: 'XL' }).size).toBeNull();
  });

  it('una talla con caracteres raros se ignora', () => {
    const selection = resolveSelection(product(), { talla: "M'; drop table products;--" });
    expect(selection.size).toBeNull();
  });
});

describe('imageForColor', () => {
  it('devuelve la imagen del color elegido', () => {
    expect(imageForColor(product(), 'negro')?.path).toBe('/products/polos-negro.svg');
  });

  it('si no hay imagen de ese color, devuelve la primera', () => {
    expect(imageForColor(product(), 'rojo')?.path).toBe('/products/polos-azul.svg');
  });

  it('sin imágenes devuelve null', () => {
    expect(imageForColor(product({ product_images: [] }), 'azul')).toBeNull();
  });
});
