import { describe, expect, it } from 'vitest';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  RETURN_WINDOW_DAYS,
  SHIPPING_FLAT_CENTS,
  formatEuros,
} from './shop';

// Intl usa un espacio sin ruptura antes del símbolo: se normaliza para comparar.
const normalize = (value: string): string => value.replace(/ /g, ' ');

describe('constantes de tienda (SPEC-001 Enmienda 1)', () => {
  it('la tarifa plana es 4,95 €', () => {
    expect(SHIPPING_FLAT_CENTS).toBe(495);
  });

  it('el envío es gratis desde 50 €', () => {
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(5000);
  });

  it('el plazo de devolución mostrado es de 30 días', () => {
    expect(RETURN_WINDOW_DAYS).toBe(30);
  });
});

describe('formatEuros', () => {
  it('formatea céntimos en euros con coma decimal', () => {
    expect(normalize(formatEuros(495))).toBe('4,95 €');
  });

  it('formatea importes redondos', () => {
    expect(normalize(formatEuros(5000))).toBe('50,00 €');
  });

  it('formatea cero', () => {
    expect(normalize(formatEuros(0))).toBe('0,00 €');
  });

  it('rechaza importes con decimales', () => {
    expect(() => formatEuros(1.5)).toThrow(RangeError);
  });

  it('rechaza importes negativos', () => {
    expect(() => formatEuros(-1)).toThrow(RangeError);
  });
});
