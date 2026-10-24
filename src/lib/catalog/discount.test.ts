import { describe, expect, it } from 'vitest';
import { cardDiscount, discountPercent, isOffer, maxOfferPercent } from './discount';

// CA-119 (T-076): porcentaje y rebaja de la tarjeta.

const variant = (priceCents: number, compareAtCents: number | null) => ({
  id: `v${priceCents}-${compareAtCents}`,
  size: 'M',
  color: 'azul',
  priceCents,
  compareAtCents,
  stock: 5,
});

describe('discountPercent', () => {
  it('es el porcentaje rebajado sobre el precio anterior, redondeado', () => {
    expect(discountPercent(8000, 10000)).toBe(20);
    expect(discountPercent(8990, 11990)).toBe(25);
    expect(discountPercent(9990, 12990)).toBe(23);
  });

  it('nunca es 0 ni 100: mínimo 1 y máximo 99', () => {
    expect(discountPercent(9999, 10000)).toBe(1);
    expect(discountPercent(1, 100000)).toBe(99);
  });
});

describe('cardDiscount', () => {
  it('sin precio anterior no hay rebaja', () => {
    expect(cardDiscount({ fromPriceCents: 2990, variants: [variant(2990, null)] })).toBeNull();
    expect(cardDiscount({ fromPriceCents: 0, variants: [] })).toBeNull();
  });

  it('usa la variante más barata (la del precio «desde»)', () => {
    const result = cardDiscount({
      fromPriceCents: 4490,
      variants: [variant(5490, 7990), variant(4490, 5990)],
    });
    expect(result).toEqual({ percent: 25, priceCents: 4490, compareAtCents: 5990 });
  });

  it('si la variante más barata no tiene rebaja, no se muestra la de otra más cara', () => {
    expect(cardDiscount({ fromPriceCents: 3000, variants: [variant(3000, null), variant(4000, 6000)] })).toBeNull();
  });

  it('ignora un precio anterior que no es mayor que el actual', () => {
    expect(cardDiscount({ fromPriceCents: 3000, variants: [variant(3000, 3000)] })).toBeNull();
  });
});

describe('isOffer y maxOfferPercent (CA-01, CA-04)', () => {
  it('es oferta si alguna variante tiene precio anterior mayor que el actual', () => {
    expect(isOffer({ variants: [variant(3000, null), variant(4000, 6000)] })).toBe(true);
    expect(isOffer({ variants: [variant(3000, null)] })).toBe(false);
    expect(isOffer({ variants: [variant(3000, 3000)] })).toBe(false);
    expect(isOffer({ variants: [] })).toBe(false);
  });

  it('el mayor porcentaje sale de todas las variantes; sin rebajas es null', () => {
    const products = [{ variants: [variant(8990, 11990)] }, { variants: [variant(4490, 5990), variant(3000, 6000)] }];
    expect(maxOfferPercent(products)).toBe(50);
    expect(maxOfferPercent([{ variants: [variant(3000, null)] }])).toBeNull();
    expect(maxOfferPercent([])).toBeNull();
  });
});
