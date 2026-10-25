import { describe, expect, it } from 'vitest';
import { badgeLabel, cartLinkLabel, totalQty } from './count';

// CA-21 y CA-24 (T-108): unidades, texto del badge y nombre accesible del enlace de la cesta.

describe('totalQty', () => {
  it('suma unidades, no líneas', () => {
    expect(totalQty([])).toBe(0);
    expect(totalQty([{ variantId: 'a', qty: 1 }])).toBe(1);
    expect(totalQty([{ variantId: 'a', qty: 3 }, { variantId: 'b', qty: 2 }])).toBe(5);
  });
});

describe('badgeLabel', () => {
  it('oculto sin unidades, la cifra hasta 9 y «9+» desde 10', () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(99)).toBe('9+');
  });
});

describe('cartLinkLabel', () => {
  it('sin unidades es «Carrito»; con ellas dice cuántas, en singular con una', () => {
    expect(cartLinkLabel(0)).toBe('Carrito');
    expect(cartLinkLabel(1)).toBe('Carrito, 1 artículo');
    expect(cartLinkLabel(2)).toBe('Carrito, 2 artículos');
    expect(cartLinkLabel(12)).toBe('Carrito, 12 artículos');
  });
});
