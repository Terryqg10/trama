import { describe, expect, it } from 'vitest';
import { parseSizeGuide, sizeGuideSchema } from './size-guide';

const valid = {
  columns: ['Pecho (cm)', 'Largo (cm)'],
  rows: [
    { size: 'S', values: ['88–92', '68'] },
    { size: 'M', values: ['96–100', '70'] },
  ],
  note: 'Medidas de ejemplo.',
};

describe('sizeGuideSchema', () => {
  it('acepta una guía válida, con y sin nota', () => {
    expect(sizeGuideSchema.safeParse(valid).success).toBe(true);
    expect(sizeGuideSchema.safeParse({ columns: valid.columns, rows: valid.rows }).success).toBe(true);
  });

  it('rechaza una fila con distinto número de valores que columnas', () => {
    const bad = { ...valid, rows: [{ size: 'S', values: ['88–92'] }] };
    expect(sizeGuideSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza una guía sin filas o sin columnas', () => {
    expect(sizeGuideSchema.safeParse({ ...valid, rows: [] }).success).toBe(false);
    expect(sizeGuideSchema.safeParse({ ...valid, columns: [] }).success).toBe(false);
  });

  it('rechaza valores que no son texto o están vacíos', () => {
    const numbers = { ...valid, rows: [{ size: 'S', values: [88, 68] }] };
    expect(sizeGuideSchema.safeParse(numbers).success).toBe(false);
    const empty = { ...valid, rows: [{ size: '', values: ['88–92', '68'] }] };
    expect(sizeGuideSchema.safeParse(empty).success).toBe(false);
  });

  it('rechaza el formato antiguo de prueba { sizes: [...] }', () => {
    expect(sizeGuideSchema.safeParse({ sizes: ['38', '40'] }).success).toBe(false);
  });
});

describe('parseSizeGuide', () => {
  it('devuelve la guía si el contenido es válido', () => {
    expect(parseSizeGuide(valid)?.rows).toHaveLength(2);
  });

  it('devuelve null, sin lanzar, si el contenido no es válido', () => {
    expect(parseSizeGuide({ sizes: ['38'] })).toBeNull();
    expect(parseSizeGuide(null)).toBeNull();
    expect(parseSizeGuide('texto')).toBeNull();
    expect(parseSizeGuide({ ...valid, rows: [{ size: 'S', values: ['1'] }] })).toBeNull();
  });
});
