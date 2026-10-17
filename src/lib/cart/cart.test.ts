import { describe, expect, it } from 'vitest';
import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  addToCart,
  capQty,
  maxQty,
  mergeCarts,
  parseSavedCart,
  removeLine,
  setLineQty,
  shippingFor,
  summarize,
} from './cart';
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from '@/lib/domain/shop';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('capQty (CA-05, test cart-qty-cap)', () => {
  it('limita al stock y avisa de que se ha limitado', () => {
    expect(capQty(4, 3)).toEqual({ qty: 3, capped: true });
  });

  it('no limita si la cantidad cabe en el stock', () => {
    expect(capQty(3, 3)).toEqual({ qty: 3, capped: false });
    expect(capQty(1, 10)).toEqual({ qty: 1, capped: false });
  });

  it('nunca pasa del tope de la línea, aunque haya más stock', () => {
    expect(maxQty(500)).toBe(MAX_LINE_QTY);
    expect(capQty(120, 500)).toEqual({ qty: MAX_LINE_QTY, capped: true });
  });

  it('sin stock no se puede pedir ninguna unidad', () => {
    expect(capQty(1, 0)).toEqual({ qty: 0, capped: true });
  });
});

describe('addToCart (CA-60)', () => {
  it('añade una línea nueva con cantidad 1', () => {
    expect(addToCart([], A, 5)).toEqual({ cart: [{ variantId: A, qty: 1 }], capped: false });
  });

  it('si la variante ya está, suma 1', () => {
    const result = addToCart([{ variantId: A, qty: 1 }], A, 5);
    expect(result.cart).toEqual([{ variantId: A, qty: 2 }]);
  });

  it('no pasa del stock y lo indica (CA-05)', () => {
    const result = addToCart([{ variantId: A, qty: 2 }], A, 2);
    expect(result).toEqual({ cart: [{ variantId: A, qty: 2 }], capped: true });
  });

  it('una variante sin stock no se añade', () => {
    expect(addToCart([], A, 0)).toEqual({ cart: [], capped: true });
  });

  it('respeta el tope de líneas distintas', () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, index) => ({
      variantId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      qty: 1,
    }));
    expect(addToCart(full, A, 5).cart).toHaveLength(MAX_CART_LINES);
  });
});

describe('setLineQty y removeLine', () => {
  const cart = [
    { variantId: A, qty: 2 },
    { variantId: B, qty: 1 },
  ];

  it('cambia la cantidad de una línea sin tocar las demás', () => {
    expect(setLineQty(cart, A, 4, 9).cart).toEqual([
      { variantId: A, qty: 4 },
      { variantId: B, qty: 1 },
    ]);
  });

  it('limita al stock al subir la cantidad', () => {
    expect(setLineQty(cart, A, 6, 3)).toEqual({
      cart: [
        { variantId: A, qty: 3 },
        { variantId: B, qty: 1 },
      ],
      capped: true,
    });
  });

  it('una cantidad menor que 1 quita la línea', () => {
    expect(setLineQty(cart, B, 0, 9).cart).toEqual([{ variantId: A, qty: 2 }]);
  });

  it('removeLine quita solo la variante indicada', () => {
    expect(removeLine(cart, A)).toEqual([{ variantId: B, qty: 1 }]);
  });
});

describe('shippingFor (CA-28, test shipping-free-threshold)', () => {
  it('es gratis cuando el total alcanza el umbral', () => {
    expect(shippingFor(FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0);
    expect(shippingFor(FREE_SHIPPING_THRESHOLD_CENTS + 1)).toBe(0);
    expect(shippingFor(12_000)).toBe(0);
  });

  it('por debajo del umbral se aplica la tarifa plana', () => {
    expect(shippingFor(FREE_SHIPPING_THRESHOLD_CENTS - 1)).toBe(SHIPPING_FLAT_CENTS);
    expect(shippingFor(1)).toBe(SHIPPING_FLAT_CENTS);
  });

  it('un carrito sin importe no tiene envío', () => {
    expect(shippingFor(0)).toBe(0);
  });
});

describe('summarize', () => {
  it('suma líneas y aplica la tarifa plana por debajo del umbral', () => {
    const totals = summarize([
      { priceCents: 1995, qty: 2 },
      { priceCents: 500, qty: 1 },
    ]);
    expect(totals).toEqual({
      subtotalCents: 4490,
      shippingCents: SHIPPING_FLAT_CENTS,
      totalCents: 4490 + SHIPPING_FLAT_CENTS,
      missingForFreeCents: FREE_SHIPPING_THRESHOLD_CENTS - 4490,
    });
  });

  it('envío gratis al llegar a 50 €: el total es el subtotal', () => {
    const totals = summarize([{ priceCents: 2500, qty: 2 }]);
    expect(totals).toEqual({
      subtotalCents: 5000,
      shippingCents: 0,
      totalCents: 5000,
      missingForFreeCents: 0,
    });
  });

  it('un carrito vacío no tiene envío ni falta nada', () => {
    expect(summarize([])).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      missingForFreeCents: 0,
    });
  });
});

describe('parseSavedCart (el almacenamiento del navegador es un input externo)', () => {
  it('sin valor guardado, carrito vacío', () => {
    expect(parseSavedCart(null)).toEqual([]);
  });

  it('lee un carrito válido', () => {
    expect(parseSavedCart(JSON.stringify([{ variantId: A, qty: 2 }]))).toEqual([{ variantId: A, qty: 2 }]);
  });

  it.each([
    ['no es JSON', '{no-json'],
    ['no es una lista', JSON.stringify({ variantId: A, qty: 1 })],
    ['id que no es uuid', JSON.stringify([{ variantId: '1; drop table', qty: 1 }])],
    ['cantidad 0', JSON.stringify([{ variantId: A, qty: 0 }])],
    ['cantidad por encima del tope', JSON.stringify([{ variantId: A, qty: 100 }])],
    ['cantidad no entera', JSON.stringify([{ variantId: A, qty: 1.5 }])],
    ['cantidad como texto', JSON.stringify([{ variantId: A, qty: '2' }])],
  ])('descarta el carrito entero si %s', (_name, raw) => {
    expect(parseSavedCart(raw)).toEqual([]);
  });

  it('descarta un carrito con demasiadas líneas', () => {
    const many = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({
      variantId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      qty: 1,
    }));
    expect(parseSavedCart(JSON.stringify(many))).toEqual([]);
  });

  it('suma las líneas repetidas de una variante con el tope de la línea', () => {
    const raw = JSON.stringify([
      { variantId: A, qty: 60 },
      { variantId: B, qty: 1 },
      { variantId: A, qty: 60 },
    ]);
    expect(parseSavedCart(raw)).toEqual([
      { variantId: A, qty: MAX_LINE_QTY },
      { variantId: B, qty: 1 },
    ]);
  });
});

describe('mergeCarts (CA-04)', () => {
  it('conserva las líneas de las dos partes sin perder ninguna', () => {
    expect(
      mergeCarts([{ variantId: A, qty: 1 }], [{ variantId: B, qty: 2 }]),
    ).toEqual([
      { variantId: A, qty: 1 },
      { variantId: B, qty: 2 },
    ]);
  });

  it('suma las cantidades de una variante presente en las dos, con el tope de la línea', () => {
    expect(mergeCarts([{ variantId: A, qty: 2 }], [{ variantId: A, qty: 3 }])).toEqual([{ variantId: A, qty: 5 }]);
    expect(mergeCarts([{ variantId: A, qty: 90 }], [{ variantId: A, qty: 30 }])).toEqual([
      { variantId: A, qty: MAX_LINE_QTY },
    ]);
  });

  it('con un lado vacío devuelve el otro', () => {
    expect(mergeCarts([], [{ variantId: B, qty: 1 }])).toEqual([{ variantId: B, qty: 1 }]);
    expect(mergeCarts([{ variantId: A, qty: 1 }], [])).toEqual([{ variantId: A, qty: 1 }]);
  });
});
