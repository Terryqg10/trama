import { describe, expect, it } from 'vitest';
import { parseCatalogParams } from './filters';

function ok(raw: Record<string, string | string[] | undefined>) {
  const result = parseCatalogParams(raw);
  if (!result.ok) throw new Error(`Se esperaba éxito: ${result.errors.join(', ')}`);
  return result.filters;
}

function errors(raw: Record<string, string | string[] | undefined>): readonly string[] {
  const result = parseCatalogParams(raw);
  if (result.ok) throw new Error('Se esperaba un error');
  return result.errors;
}

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

describe('parseCatalogParams: valores inválidos se rechazan, no se ignoran', () => {
  it('género desconocido', () => {
    expect(errors({ genero: 'niño' }).join(' ')).toContain('genero');
  });

  it('categoría desconocida', () => {
    expect(errors({ categoria: 'sombreros' }).join(' ')).toContain('categoria');
  });

  it('orden inexistente', () => {
    expect(errors({ orden: 'aleatorio' }).join(' ')).toContain('orden');
  });

  it('precio negativo', () => {
    expect(errors({ min: '-5' }).join(' ')).toContain('min');
  });

  it('precio con decimales', () => {
    expect(errors({ max: '10.5' }).join(' ')).toContain('max');
  });

  it('precio no numérico', () => {
    expect(errors({ min: 'barato' }).join(' ')).toContain('min');
  });

  it('mínimo mayor que máximo', () => {
    expect(errors({ min: '80', max: '20' }).join(' ')).toContain('min');
  });

  it('talla con caracteres raros', () => {
    expect(errors({ talla: "M'; drop table products;--" }).join(' ')).toContain('talla');
  });

  it('color con números o símbolos', () => {
    expect(errors({ color: 'azul<script>' }).join(' ')).toContain('color');
  });

  it('novedades con un valor distinto de 1', () => {
    expect(errors({ novedades: 'si' }).join(' ')).toContain('novedades');
  });

  it('parámetro conocido repetido', () => {
    expect(errors({ genero: ['hombre', 'mujer'] }).join(' ')).toContain('repetido');
  });

  it('los mensajes de error están en español y listan las opciones', () => {
    const message = errors({ genero: 'niño' }).join(' ');
    expect(message).toContain('valor no permitido');
    expect(message).toContain('hombre, mujer');
    expect(message).not.toMatch(/invalid|expected/i);
  });

  it('todos los mensajes de error están en español', () => {
    const all = errors({
      genero: 'x',
      categoria: 'x',
      ocasion: 'x',
      orden: 'x',
      min: '-1',
      max: 'x',
      talla: '??',
      color: '1',
      novedades: 'x',
    }).join(' ');
    expect(all).not.toMatch(/invalid|expected|received/i);
  });

  it('acumula varios errores', () => {
    expect(errors({ genero: 'x', orden: 'y' }).length).toBeGreaterThanOrEqual(2);
  });
});
