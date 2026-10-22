import { capitalize } from './facets';
import type { CatalogFilters } from './filters';

/** Un filtro activo que se puede quitar por separado (CA-16, T-080). El precio es uno solo: quita `min` y `max`. */
export type ActiveFilterKey = 'genero' | 'categoria' | 'ocasion' | 'talla' | 'color' | 'precio';

export interface ActiveFilter {
  readonly key: ActiveFilterKey;
  /** Nombre del filtro («Categoría»). */
  readonly label: string;
  /** Valor elegido («Blusas», «25–70 €»). */
  readonly value: string;
}

const euros = (cents: number): string => String(cents / 100);

function priceValue(min: number | undefined, max: number | undefined): string {
  if (min !== undefined && max !== undefined) return `${euros(min)}–${euros(max)} €`;
  if (min !== undefined) return `Desde ${euros(min)} €`;
  return `Hasta ${euros(max ?? 0)} €`;
}

/**
 * Filtros activos en el orden del panel. El género solo cuenta donde lo elige el usuario (Novedades): en `/hombre` y
 * `/mujer` lo fija la ruta y no se puede quitar.
 */
export function activeFilters(filters: CatalogFilters, showGender: boolean): ActiveFilter[] {
  const items: ActiveFilter[] = [];
  if (showGender && filters.gender) items.push({ key: 'genero', label: 'Género', value: capitalize(filters.gender) });
  if (filters.category) items.push({ key: 'categoria', label: 'Categoría', value: capitalize(filters.category) });
  if (filters.occasion) items.push({ key: 'ocasion', label: 'Ocasión', value: capitalize(filters.occasion) });
  if (filters.size) items.push({ key: 'talla', label: 'Talla', value: filters.size });
  if (filters.color) items.push({ key: 'color', label: 'Color', value: capitalize(filters.color) });
  if (filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined) {
    items.push({ key: 'precio', label: 'Precio', value: priceValue(filters.minPriceCents, filters.maxPriceCents) });
  }
  return items;
}

/**
 * Parámetros de la URL sin el filtro `drop`: conserva el resto de filtros y el orden (si no es el de por defecto). Es el
 * destino de la X de cada chip (CA-16). Los importes van en euros enteros, como en el resto de la URL.
 */
export function queryWithout(filters: CatalogFilters, showGender: boolean, drop: ActiveFilterKey): Record<string, string> {
  const query: Record<string, string> = {};
  if (showGender && filters.gender && drop !== 'genero') query.genero = filters.gender;
  if (filters.category && drop !== 'categoria') query.categoria = filters.category;
  if (filters.occasion && drop !== 'ocasion') query.ocasion = filters.occasion;
  if (filters.size && drop !== 'talla') query.talla = filters.size;
  if (filters.color && drop !== 'color') query.color = filters.color;
  if (drop !== 'precio') {
    if (filters.minPriceCents !== undefined) query.min = euros(filters.minPriceCents);
    if (filters.maxPriceCents !== undefined) query.max = euros(filters.maxPriceCents);
  }
  if (filters.sort !== 'novedades') query.orden = filters.sort;
  return query;
}
