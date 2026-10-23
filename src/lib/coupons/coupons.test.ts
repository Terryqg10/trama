import { describe, expect, it } from 'vitest';
import { discountFor, withDiscount } from './amounts';
import { COUPON_CODE_PATTERN, COUPON_PERCENT_OFF, couponCodeSchema, generateCouponCode } from './code';
import { describeCouponFailure, type CouponFailure } from './messages';
import { classifyCoupon } from './store';

// CA-135, CA-137 y CA-138 (T-093, nivel unitario). El acceso a la BD y a Stripe lo comprueban los tests de integración.

describe('generateCouponCode (CA-135)', () => {
  it('tiene la forma TRAMA-XXXX-XXXX', () => {
    expect(generateCouponCode()).toMatch(COUPON_CODE_PATTERN);
  });

  it('nunca usa caracteres ambiguos (0, 1, I, L, O) en 2000 códigos', () => {
    for (let i = 0; i < 2000; i += 1) {
      const body = generateCouponCode().slice('TRAMA-'.length).replace('-', '');
      expect(body).not.toMatch(/[01ILO]/);
    }
  });

  it('usa todo el alfabeto: con el aleatorio en el mínimo y en el máximo da A y 9', () => {
    expect(generateCouponCode(() => 0)).toBe('TRAMA-AAAA-AAAA');
    expect(generateCouponCode((max) => max - 1)).toBe('TRAMA-9999-9999');
  });

  it('pide un aleatorio uniforme en [0, 31) y no usa Math.random', () => {
    const asked: number[] = [];
    generateCouponCode((max) => {
      asked.push(max);
      return 0;
    });
    expect(asked).toHaveLength(8);
    expect(new Set(asked)).toEqual(new Set([31]));
  });

  it('con el generador real, 2000 códigos casi nunca se repiten', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateCouponCode()));
    expect(codes.size).toBeGreaterThan(1995);
  });
});

describe('couponCodeSchema (CA-137)', () => {
  it('acepta el código escrito en minúsculas y con espacios alrededor, y lo normaliza', () => {
    const result = couponCodeSchema.safeParse('  trama-abcd-ef23 ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('TRAMA-ABCD-EF23');
  });

  it.each(['', 'TRAMA', 'TRAMA-ABCD', 'TRAMA-ABCD-EFG', 'TRAMA-ABCD-EFGHJ', 'TRAMA-ABCD-EFG0', 'TRAMA-ABCD-EFGO', 'TRAMA-ABCD-EFG1', 'TRAMA-ABCD-EFGI', 'TRAMA-ABCD-EFGL', 'OTRO-ABCD-EFGH', "TRAMA-ABCD-EFGH'; drop"])(
    'rechaza %j',
    (code) => {
      expect(couponCodeSchema.safeParse(code).success).toBe(false);
    },
  );
});

describe('importes con cupón (CA-138)', () => {
  it('el descuento es el 10 % del subtotal, redondeado hacia abajo al céntimo', () => {
    expect(discountFor(2990, 10)).toBe(299);
    expect(discountFor(1995, 10)).toBe(199);
    expect(discountFor(9, 10)).toBe(0);
    expect(discountFor(10, 10)).toBe(1);
    expect(discountFor(0, 10)).toBe(0);
    expect(COUPON_PERCENT_OFF).toBe(10);
  });

  it('nunca supera el subtotal ni es negativo', () => {
    expect(discountFor(1000, 100)).toBe(1000);
    expect(discountFor(1000, 0)).toBe(0);
    expect(discountFor(-5, 10)).toBe(0);
  });

  it('total = subtotal − descuento + envío, con envío tarifa plana bajo el umbral', () => {
    const totals = withDiscount({ subtotalCents: 1995, shippingCents: 495, totalCents: 2490, missingForFreeCents: 3005 }, 10);
    expect(totals.discountCents).toBe(199);
    expect(totals.shippingCents).toBe(495);
    expect(totals.totalCents).toBe(1995 - 199 + 495);
  });

  it('el envío gratis se decide antes del descuento: un pedido de justo el umbral conserva el envío gratis', () => {
    const totals = withDiscount({ subtotalCents: 5000, shippingCents: 0, totalCents: 5000, missingForFreeCents: 0 }, 10);
    expect(totals.discountCents).toBe(500);
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(4500);
  });

  it('sin porcentaje deja los importes como estaban', () => {
    const base = { subtotalCents: 2990, shippingCents: 495, totalCents: 3485, missingForFreeCents: 2010 };
    expect(withDiscount(base, 0)).toEqual({ ...base, discountCents: 0 });
  });
});

describe('classifyCoupon (CA-137, CA-139)', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const future = '2026-11-01T00:00:00Z';
  const past = '2026-10-01T00:00:00Z';

  it('un cupón sin canjear y dentro de plazo es válido', () => {
    expect(classifyCoupon({ expires_at: future, redeemed_at: null }, now)).toBe('valid');
  });

  it('uno pasado de fecha está caducado, incluido el instante exacto de caducidad', () => {
    expect(classifyCoupon({ expires_at: past, redeemed_at: null }, now)).toBe('expired');
    expect(classifyCoupon({ expires_at: '2026-10-23T12:00:00Z', redeemed_at: null }, now)).toBe('expired');
  });

  it('uno canjeado manda sobre uno caducado', () => {
    expect(classifyCoupon({ expires_at: future, redeemed_at: '2026-10-22T10:00:00Z' }, now)).toBe('redeemed');
    expect(classifyCoupon({ expires_at: past, redeemed_at: '2026-10-02T10:00:00Z' }, now)).toBe('redeemed');
  });
});

describe('describeCouponFailure (CA-137)', () => {
  it('cada motivo tiene un mensaje concreto y distinto', () => {
    const reasons: CouponFailure[] = ['unknown', 'expired', 'redeemed', 'notFirstPurchase', 'inUse'];
    const messages = reasons.map(describeCouponFailure);
    expect(new Set(messages).size).toBe(reasons.length);
    for (const message of messages) expect(message.length).toBeGreaterThan(10);
  });
});
