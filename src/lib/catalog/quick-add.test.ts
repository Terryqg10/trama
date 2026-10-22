import { describe, expect, it } from 'vitest';
import { quickAddData } from './quick-add';

// CA-120 (T-077): tallas del panel de compra rápida.

const v = (id: string, size: string, color: string, stock: number) => ({
  id,
  size,
  color,
  priceCents: 2990,
  compareAtCents: null,
  stock,
});

describe('quickAddData', () => {
  it('toma el primer color con stock y todas sus tallas, ordenadas, con las agotadas incluidas', () => {
    const data = quickAddData({
      colors: ['azul', 'negro'],
      variants: [v('a3', 'L', 'azul', 4), v('a1', 'S', 'azul', 0), v('a2', 'M', 'azul', 2), v('n1', 'M', 'negro', 9)],
    });
    expect(data?.color).toBe('azul');
    expect(data?.sizes).toEqual([
      { variantId: 'a1', size: 'S', stock: 0 },
      { variantId: 'a2', size: 'M', stock: 2 },
      { variantId: 'a3', size: 'L', stock: 4 },
    ]);
    expect(data?.moreColors).toBe(1);
  });

  it('salta un primer color agotado y usa el siguiente con stock', () => {
    const data = quickAddData({
      colors: ['azul', 'negro'],
      variants: [v('a1', 'M', 'azul', 0), v('n1', 'M', 'negro', 3)],
    });
    expect(data?.color).toBe('negro');
    expect(data?.sizes).toEqual([{ variantId: 'n1', size: 'M', stock: 3 }]);
    expect(data?.moreColors).toBe(1);
  });

  it('con un solo color no avisa de más colores', () => {
    expect(quickAddData({ colors: ['azul'], variants: [v('a1', 'M', 'azul', 1)] })?.moreColors).toBe(0);
  });

  it('las tallas numéricas se ordenan como números y las de letra van antes', () => {
    const data = quickAddData({
      colors: ['azul'],
      variants: [v('1', '42', 'azul', 1), v('2', 'M', 'azul', 1), v('3', '38', 'azul', 1), v('4', 'XS', 'azul', 1)],
    });
    expect(data?.sizes.map((s) => s.size)).toEqual(['XS', 'M', '38', '42']);
  });

  it('un producto agotado no tiene compra rápida', () => {
    expect(quickAddData({ colors: ['azul'], variants: [v('a1', 'M', 'azul', 0)] })).toBeNull();
    expect(quickAddData({ colors: [], variants: [] })).toBeNull();
  });
});
