import { describe, expect, it } from 'vitest';
import { activeFilters, queryWithout } from './active-filters';
import type { CatalogFilters } from './filters';

// CA-16 (T-080): filtros activos y la URL que queda al quitar uno.

const base: CatalogFilters = { onlyNew: false, sort: 'novedades' };
const all: CatalogFilters = {
  ...base,
  gender: 'mujer',
  category: 'blusas',
  occasion: 'vestir',
  size: 'M',
  color: 'negro',
  minPriceCents: 2500,
  maxPriceCents: 7000,
  sort: 'precio-asc',
};

describe('activeFilters', () => {
  it('sin filtros no hay ninguno', () => {
    expect(activeFilters(base, true)).toEqual([]);
  });

  it('lista cada filtro con su nombre y valor, en el orden del panel; el precio es uno solo', () => {
    expect(activeFilters(all, true)).toEqual([
      { key: 'genero', label: 'Género', value: 'Mujer' },
      { key: 'categoria', label: 'Categoría', value: 'Blusas' },
      { key: 'ocasion', label: 'Ocasión', value: 'Vestir' },
      { key: 'talla', label: 'Talla', value: 'M' },
      { key: 'color', label: 'Color', value: 'Negro' },
      { key: 'precio', label: 'Precio', value: '25–70 €' },
    ]);
  });

  it('el género no se lista donde lo fija la ruta (/hombre, /mujer)', () => {
    expect(activeFilters(all, false).map((item) => item.key)).not.toContain('genero');
  });

  it('el precio con un solo extremo dice «Desde» o «Hasta»', () => {
    expect(activeFilters({ ...base, minPriceCents: 3000 }, false)[0]?.value).toBe('Desde 30 €');
    expect(activeFilters({ ...base, maxPriceCents: 4500 }, false)[0]?.value).toBe('Hasta 45 €');
  });
});

describe('queryWithout', () => {
  it('quita solo el filtro indicado y conserva el resto y el orden', () => {
    expect(queryWithout(all, true, 'talla')).toEqual({
      genero: 'mujer',
      categoria: 'blusas',
      ocasion: 'vestir',
      color: 'negro',
      min: '25',
      max: '70',
      orden: 'precio-asc',
    });
  });

  it('quitar el precio quita min y max a la vez', () => {
    const query = queryWithout(all, false, 'precio');
    expect(query).not.toHaveProperty('min');
    expect(query).not.toHaveProperty('max');
    expect(query).toMatchObject({ categoria: 'blusas', talla: 'M', color: 'negro', orden: 'precio-asc' });
  });

  it('el orden por defecto no ensucia la URL y sin otros filtros queda vacía', () => {
    expect(queryWithout({ ...base, category: 'faldas' }, false, 'categoria')).toEqual({});
  });

  it('el género solo va en la URL donde lo elige el usuario', () => {
    expect(queryWithout(all, false, 'talla')).not.toHaveProperty('genero');
  });
});
