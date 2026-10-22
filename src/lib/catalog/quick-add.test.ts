import { describe, expect, it } from 'vitest';
import { imageForColor, quickAddData } from './quick-add';

// CA-121 (T-081): colores, tallas e imagen de los controles de la tarjeta.

const v = (id: string, size: string, color: string, stock: number) => ({
  id,
  size,
  color,
  priceCents: 2990,
  compareAtCents: null,
  stock,
});

describe('quickAddData', () => {
  it('devuelve todos los colores en su orden, cada uno con sus tallas ordenadas y las agotadas incluidas', () => {
    const data = quickAddData({
      colors: ['azul', 'negro'],
      variants: [v('a3', 'L', 'azul', 4), v('a1', 'S', 'azul', 0), v('a2', 'M', 'azul', 2), v('n1', 'M', 'negro', 9)],
    });
    expect(data?.colors.map((c) => c.color)).toEqual(['azul', 'negro']);
    expect(data?.colors[0]?.sizes).toEqual([
      { variantId: 'a1', size: 'S', stock: 0 },
      { variantId: 'a2', size: 'M', stock: 2 },
      { variantId: 'a3', size: 'L', stock: 4 },
    ]);
    expect(data?.colors[1]?.sizes).toEqual([{ variantId: 'n1', size: 'M', stock: 9 }]);
  });

  it('el color inicial es el primero con stock', () => {
    const data = quickAddData({
      colors: ['azul', 'negro'],
      variants: [v('a1', 'M', 'azul', 0), v('n1', 'M', 'negro', 3)],
    });
    expect(data?.defaultColor).toBe('negro');
    expect(data?.colors.map((c) => c.color)).toEqual(['azul', 'negro']);
  });

  it('las tallas numéricas se ordenan como números y las de letra van antes', () => {
    const data = quickAddData({
      colors: ['azul'],
      variants: [v('1', '42', 'azul', 1), v('2', 'M', 'azul', 1), v('3', '38', 'azul', 1), v('4', 'XS', 'azul', 1)],
    });
    expect(data?.colors[0]?.sizes.map((s) => s.size)).toEqual(['XS', 'M', '38', '42']);
  });

  it('un producto agotado no tiene controles', () => {
    expect(quickAddData({ colors: ['azul'], variants: [v('a1', 'M', 'azul', 0)] })).toBeNull();
    expect(quickAddData({ colors: [], variants: [] })).toBeNull();
  });
});

describe('imageForColor', () => {
  const images = [
    { path: '/a.webp', alt: 'Camisa, color blanco' },
    { path: '/b.webp', alt: 'Camisa, color Azul' },
  ];

  it('elige la imagen cuyo texto alternativo acaba en «color <nombre>», sin distinguir mayúsculas', () => {
    expect(imageForColor(images, 'azul')?.path).toBe('/b.webp');
    expect(imageForColor(images, 'blanco')?.path).toBe('/a.webp');
  });

  it('si no hay imagen de ese color usa la primera; sin imágenes, undefined', () => {
    expect(imageForColor(images, 'rojo')?.path).toBe('/a.webp');
    expect(imageForColor([], 'azul')).toBeUndefined();
  });
});
