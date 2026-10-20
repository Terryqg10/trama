import { describe, expect, it } from 'vitest';
import { parseCatalogParams } from './filters';

const ok = parseCatalogParams;
const DEFAULT = { onlyNew: false, sort: 'novedades' } as const;

describe('parseCatalogParams: valores por defecto', () => {
  it('sin parámetros: sin filtros, ordenado por novedades', () => {
    expect(ok({})).toEqual({ onlyNew: false, sort: 'novedades' });
  });

  it('trata los parámetros vacíos como ausentes (formularios)', () => {
    expect(ok({ talla: '', color: '', min: '' })).toEqual({ onlyNew: false, sort: 'novedades' });
  });
});

describe('parseCatalogParams: filtros válidos', () => {
  it('género y categoría (CA-01)', () => {
    const filters = ok({ genero: 'mujer', categoria: 'blusas' });
    expect(filters.gender).toBe('mujer');
    expect(filters.category).toBe('blusas');
  });

  it('ocasión (CA-32)', () => {
    expect(ok({ ocasion: 'vestir' }).occasion).toBe('vestir');
  });

  it('talla en minúsculas se normaliza a mayúsculas (CA-27)', () => {
    expect(ok({ talla: 'xl' }).size).toBe('XL');
    expect(ok({ talla: '40' }).size).toBe('40');
  });

  it('color en mayúsculas se normaliza a minúsculas', () => {
    expect(ok({ color: 'Azul' }).color).toBe('azul');
  });

  it('precios en euros se convierten a céntimos', () => {
    const filters = ok({ min: '20', max: '50' });
    expect(filters.minPriceCents).toBe(2000);
    expect(filters.maxPriceCents).toBe(5000);
  });

  it('solo novedades (CA-26)', () => {
    expect(ok({ novedades: '1' }).onlyNew).toBe(true);
  });

  it('cada orden permitido', () => {
    expect(ok({ orden: 'precio-asc' }).sort).toBe('precio-asc');
    expect(ok({ orden: 'precio-desc' }).sort).toBe('precio-desc');
    expect(ok({ orden: 'novedades' }).sort).toBe('novedades');
  });

  it('ignora parámetros desconocidos (p. ej. utm_source)', () => {
    expect(ok({ utm_source: 'newsletter', genero: 'hombre' }).gender).toBe('hombre');
  });
});

describe('parseCatalogParams: valores inválidos se ignoran (CA-09, RF-09)', () => {
  it.each([
    ['género desconocido', { genero: 'niño' }],
    ['categoría desconocida', { categoria: 'sombreros' }],
    ['orden inexistente', { orden: 'aleatorio' }],
    ['precio negativo', { min: '-5' }],
    ['precio con decimales', { max: '10.5' }],
    ['precio no numérico', { min: 'barato' }],
    ['talla con caracteres raros', { talla: "M'; drop table products;--" }],
    ['talla fuera de la lista (XXXL)', { talla: 'XXXXXXL' }],
    ['color con números o símbolos', { color: 'azul<script>' }],
    ['novedades con un valor distinto de 1', { novedades: 'si' }],
    ['parámetro conocido repetido', { genero: ['hombre', 'mujer'] }],
  ])('%s: se ignora sin fallar', (_label, raw) => {
    expect(ok(raw)).toEqual(DEFAULT);
  });

  it('el valor inválido no anula los válidos de la misma URL', () => {
    expect(ok({ genero: 'niño', categoria: 'blusas', orden: 'x' })).toEqual({
      ...DEFAULT,
      category: 'blusas',
    });
  });

  it('mínimo mayor que máximo: se ignora el mínimo y se conserva el máximo', () => {
    expect(ok({ min: '80', max: '20' })).toEqual({ ...DEFAULT, maxPriceCents: 2000 });
  });

  it('mínimo igual al máximo es válido', () => {
    expect(ok({ min: '20', max: '20' })).toEqual({
      ...DEFAULT,
      minPriceCents: 2000,
      maxPriceCents: 2000,
    });
  });
});

describe('parseCatalogParams: las once categorías (CA-79)', () => {
  it.each(['polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'abrigos', 'jerseis', 'faldas', 'tops'])(
    'acepta la categoría %s',
    (categoria) => {
      expect(ok({ categoria }).category).toBe(categoria);
    },
  );

  it('rechaza una categoría desconocida', () => {
    expect(ok({ categoria: 'bufandas' }).category).toBeUndefined();
  });
});
