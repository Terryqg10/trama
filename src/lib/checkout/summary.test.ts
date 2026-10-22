import { describe, expect, it } from 'vitest';
import type { CartLineInfo } from '@/lib/cart/lines';
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from '@/lib/domain/shop';
import { buildCheckoutSummary, describeIssue } from './summary';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function info(variantId: string, overrides: Partial<CartLineInfo> = {}): CartLineInfo {
  return {
    variantId,
    productName: 'Polo piqué básico',
    slug: 'polo-pique-basico',
    size: 'M',
    color: 'negro',
    priceCents: 2990,
    compareAtCents: null,
    stock: 8,
    image: null,
    ...overrides,
  };
}

describe('buildCheckoutSummary (CA-09: importes del servidor)', () => {
  it('calcula líneas, envío y total con los precios de la BD', () => {
    const summary = buildCheckoutSummary([{ variantId: A, qty: 1 }], [info(A)]);
    expect(summary.issues).toEqual([]);
    expect(summary.lines).toEqual([
      { variantId: A, productName: 'Polo piqué básico', size: 'M', color: 'negro', qty: 1, unitPriceCents: 2990 },
    ]);
    expect(summary.totals).toMatchObject({
      subtotalCents: 2990,
      shippingCents: SHIPPING_FLAT_CENTS,
      totalCents: 2990 + SHIPPING_FLAT_CENTS,
    });
  });

  it('el envío es gratis al llegar al umbral', () => {
    const summary = buildCheckoutSummary([{ variantId: A, qty: 2 }], [info(A)]);
    expect(summary.totals.subtotalCents).toBeGreaterThanOrEqual(FREE_SHIPPING_THRESHOLD_CENTS);
    expect(summary.totals.shippingCents).toBe(0);
    expect(summary.totals.totalCents).toBe(5980);
  });

  it('el precio sale siempre de la información del servidor, nunca de otro sitio', () => {
    const cheap = buildCheckoutSummary([{ variantId: A, qty: 1 }], [info(A, { priceCents: 100 })]);
    expect(cheap.lines[0]?.unitPriceCents).toBe(100);
    expect(cheap.totals.subtotalCents).toBe(100);
  });
});

describe('buildCheckoutSummary: líneas que bloquean el pago', () => {
  it('una variante que no existe se marca como no disponible y no suma', () => {
    const summary = buildCheckoutSummary(
      [
        { variantId: A, qty: 1 },
        { variantId: B, qty: 1 },
      ],
      [info(A)],
    );
    expect(summary.issues).toEqual([{ kind: 'unavailable', variantId: B }]);
    expect(summary.lines).toHaveLength(1);
  });

  it('una variante agotada se marca y no suma', () => {
    const summary = buildCheckoutSummary([{ variantId: A, qty: 1 }], [info(A, { stock: 0 })]);
    expect(summary.issues).toEqual([
      { kind: 'soldOut', variantId: A, name: 'Polo piqué básico, talla M, color negro' },
    ]);
    expect(summary.lines).toEqual([]);
    expect(summary.totals.totalCents).toBe(0);
  });

  it('una cantidad por encima del stock se marca con lo que queda', () => {
    const summary = buildCheckoutSummary([{ variantId: A, qty: 5 }], [info(A, { stock: 3 })]);
    expect(summary.issues).toEqual([
      {
        kind: 'insufficientStock',
        variantId: A,
        name: 'Polo piqué básico, talla M, color negro',
        requested: 5,
        available: 3,
      },
    ]);
  });

  it('describeIssue nombra la variante afectada y ofrece ajustar', () => {
    const [issue] = buildCheckoutSummary([{ variantId: A, qty: 5 }], [info(A, { stock: 3 })]).issues;
    expect(issue).toBeDefined();
    if (!issue) return;
    expect(describeIssue(issue)).toContain('Polo piqué básico, talla M, color negro');
    expect(describeIssue(issue)).toContain('solo quedan 3');
  });
});
