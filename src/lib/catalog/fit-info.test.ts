import { describe, expect, it } from 'vitest';
import { fitInfoOf, formatModelHeight, modelSentence } from './fit-info';

describe('formatModelHeight', () => {
  it('pasa centímetros a metros con coma decimal y dos decimales', () => {
    expect(formatModelHeight(185)).toBe('1,85 m');
    expect(formatModelHeight(176)).toBe('1,76 m');
  });

  it('conserva el cero final (1,60 m)', () => {
    expect(formatModelHeight(160)).toBe('1,60 m');
  });

  it('omite una altura no válida', () => {
    expect(formatModelHeight(0)).toBeNull();
    expect(formatModelHeight(-5)).toBeNull();
    expect(formatModelHeight(Number.NaN)).toBeNull();
  });
});

describe('modelSentence', () => {
  it('con altura y talla: las dos partes', () => {
    expect(modelSentence(185, 'M')).toBe('Mide 1,85 m y lleva la talla M');
  });

  it('con solo la altura', () => {
    expect(modelSentence(185, null)).toBe('Mide 1,85 m');
  });

  it('con solo la talla', () => {
    expect(modelSentence(null, 'M')).toBe('Lleva la talla M');
  });

  it('sin ninguno, o con la talla vacía, devuelve null', () => {
    expect(modelSentence(null, null)).toBeNull();
    expect(modelSentence(null, '   ')).toBeNull();
    expect(modelSentence(0, '')).toBeNull();
  });
});

describe('fitInfoOf', () => {
  const base = { modelHeightCm: 185, modelSize: 'M', composition: '100% algodón', care: 'Lavar a 30 °C.' };

  it('reúne modelo, composición y cuidados', () => {
    expect(fitInfoOf(base)).toEqual({
      model: 'Mide 1,85 m y lleva la talla M',
      composition: '100% algodón',
      care: 'Lavar a 30 °C.',
    });
  });

  it('un producto con solo algunos datos conserva solo esos', () => {
    const info = fitInfoOf({ ...base, modelHeightCm: null, modelSize: null, care: null });
    expect(info).toEqual({ model: null, composition: '100% algodón', care: null });
  });

  it('los textos vacíos o con solo espacios cuentan como ausentes', () => {
    const info = fitInfoOf({ ...base, composition: '  ', care: '' });
    expect(info?.composition).toBeNull();
    expect(info?.care).toBeNull();
  });

  it('sin ningún dato devuelve null', () => {
    expect(fitInfoOf({ modelHeightCm: null, modelSize: null, composition: null, care: null })).toBeNull();
  });
});
