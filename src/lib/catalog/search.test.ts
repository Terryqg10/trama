import { describe, expect, it } from 'vitest';
import { MAX_SEARCH_LENGTH, containsPattern, parseSearchQuery } from './search';

// CA-93 (T-052): el texto de búsqueda se normaliza y los comodines del usuario se tratan como texto.

describe('parseSearchQuery', () => {
  it('recorta y colapsa los espacios', () => {
    expect(parseSearchQuery('  abrigo   largo  ')).toBe('abrigo largo');
  });

  it('devuelve vacío si no hay texto o no es una cadena', () => {
    expect(parseSearchQuery(undefined)).toBe('');
    expect(parseSearchQuery('')).toBe('');
    expect(parseSearchQuery('   ')).toBe('');
  });

  it('con varios valores usa el primero', () => {
    expect(parseSearchQuery(['jersey', 'abrigo'])).toBe('jersey');
  });

  it('quita los caracteres de control y el asterisco (comodín de PostgREST)', () => {
    expect(parseSearchQuery('abri\u0000go\n*')).toBe('abri go');
  });

  it('solo deja letras, números y guiones: comillas, ;, %, _, = y paréntesis pasan a espacio', () => {
    expect(parseSearchQuery("'; drop table products; --")).toBe('drop table products');
    expect(parseSearchQuery('100% algodón_x')).toBe('100 algodón x');
    expect(parseSearchQuery('a=b (c)')).toBe('a b c');
    expect(parseSearchQuery('<b>x</b>')).toBe('b x b');
    expect(parseSearchQuery('%_*')).toBe('');
  });

  it('conserva un guion simple y colapsa los guiones repetidos', () => {
    expect(parseSearchQuery('cuello-alto')).toBe('cuello-alto');
    expect(parseSearchQuery('ab--cd')).toBe('ab cd');
  });

  it('limita la longitud', () => {
    expect(parseSearchQuery('a'.repeat(200))).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it('conserva tildes y mayúsculas', () => {
    expect(parseSearchQuery('Paño')).toBe('Paño');
  });
});

describe('containsPattern', () => {
  it('envuelve el texto en comodines', () => {
    expect(containsPattern('jersey')).toBe('%jersey%');
  });

  it('escapa %, _ y \\ para que sean texto', () => {
    expect(containsPattern('100%')).toBe('%100\\%%');
    expect(containsPattern('a_b')).toBe('%a\\_b%');
    expect(containsPattern('a\\b')).toBe('%a\\\\b%');
  });
});

describe('searchHitsSchema y toSearchHit (CA-106)', () => {
  const hit = { id: 'a', slug: 'a', name: 'A', priceCents: 100, image: null };

  it('acepta hasta 5 sugerencias y rechaza 6', async () => {
    const { searchHitsSchema } = await import('./search');
    expect(searchHitsSchema.safeParse(Array.from({ length: 5 }, () => hit)).success).toBe(true);
    expect(searchHitsSchema.safeParse(Array.from({ length: 6 }, () => hit)).success).toBe(false);
  });

  it('rechaza un precio negativo o con decimales', async () => {
    const { searchHitSchema } = await import('./search');
    expect(searchHitSchema.safeParse({ ...hit, priceCents: -1 }).success).toBe(false);
    expect(searchHitSchema.safeParse({ ...hit, priceCents: 10.5 }).success).toBe(false);
  });
});
