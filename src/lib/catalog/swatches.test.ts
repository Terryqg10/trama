import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SWATCH_COLORS, swatchClass } from './swatches';

// SPEC-001 Enmienda 12 / ADR-007 (T-030): el mapa de colores, el CSS de los tokens y los colores del
// catálogo de ejemplo tienen que estar de acuerdo. Si no, un círculo saldría sin color.

const ROOT = process.cwd();
const css = fs.readFileSync(path.join(ROOT, 'src', 'app', 'swatches.css'), 'utf8');

/** Colores del catálogo de ejemplo: los que nombran las imágenes de `public/products/`. */
function catalogColors(): string[] {
  const colors = new Set<string>();
  for (const file of fs.readdirSync(path.join(ROOT, 'public', 'products'))) {
    const match = /^[a-z]+-([a-z]+)\.svg$/.exec(file);
    if (match?.[1]) colors.add(match[1]);
  }
  return [...colors].sort();
}

describe('swatchClass', () => {
  it('devuelve la clase del token del color', () => {
    expect(swatchClass('burdeos')).toBe('bg-swatch-burdeos');
    expect(swatchClass('negro')).toBe('bg-swatch-negro');
  });

  it('devuelve null para un color sin token (CA-58), sin inventar uno', () => {
    expect(swatchClass('turquesa')).toBeNull();
    expect(swatchClass('')).toBeNull();
  });

  it('no se deja engañar por propiedades heredadas de los objetos', () => {
    expect(swatchClass('constructor')).toBeNull();
    expect(swatchClass('toString')).toBeNull();
    expect(swatchClass('__proto__')).toBeNull();
  });
});

describe('sincronía entre el mapa, el CSS y el catálogo', () => {
  it('todos los colores del catálogo de ejemplo tienen muestra', () => {
    expect(catalogColors().length).toBeGreaterThan(0);
    for (const color of catalogColors()) {
      expect(SWATCH_COLORS, `falta la muestra de «${color}»`).toContain(color);
    }
  });

  it('cada color del mapa tiene su token --color-swatch-<color> en el CSS', () => {
    for (const color of SWATCH_COLORS) {
      expect(css, `falta --color-swatch-${color} en swatches.css`).toMatch(
        new RegExp(`--color-swatch-${color}\\s*:`),
      );
    }
  });

  it('cada token del CSS tiene su entrada en el mapa', () => {
    const tokens = [...css.matchAll(/--color-swatch-([a-z]+)\s*:/g)].map((match) => match[1]);
    expect(tokens.sort()).toEqual([...SWATCH_COLORS].sort());
  });

  it('el valor de cada token es un color hexadecimal válido', () => {
    for (const match of css.matchAll(/--color-swatch-[a-z]+\s*:\s*([^;]+);/g)) {
      expect(match[1]?.trim()).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('las clases del mapa llevan el nombre entero del token (Tailwind solo genera las que ve)', () => {
    for (const color of SWATCH_COLORS) {
      expect(swatchClass(color)).toBe(`bg-swatch-${color}`);
    }
  });
});
