import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToRgb, relativeLuminance } from '../../scripts/lib/contrast.mjs';

describe('contrastRatio', () => {
  it('blanco sobre negro es 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('negro sobre blanco es 21:1 (orden indiferente)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('mismo color da 1:1', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('acepta hex de 3 dígitos', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('rechaza hex inválido', () => {
    expect(() => contrastRatio('not-a-color', '#000000')).toThrow();
  });
});

describe('hexToRgb', () => {
  it('convierte #000000 a [0,0,0]', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });
  it('convierte #ffffff a [255,255,255]', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });
  it('ignora el canal alfa si hay 8 dígitos', () => {
    expect(hexToRgb('#336699ff')).toEqual([0x33, 0x66, 0x99]);
  });
});

describe('relativeLuminance', () => {
  it('blanco = 1', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
  it('negro = 0', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });
});
