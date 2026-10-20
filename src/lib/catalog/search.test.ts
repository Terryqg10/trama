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
