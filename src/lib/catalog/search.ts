/** Longitud máxima del texto de búsqueda (CA-93). */
export const MAX_SEARCH_LENGTH = 60;

/**
 * Normaliza el texto de la búsqueda (RF-25): una sola cadena, sin caracteres de control, sin `*` (PostgREST lo
 * trata como comodín), con los espacios colapsados y recortada. Entrada inválida o vacía → cadena vacía.
 */
export function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .trim();
}

/** Patrón `ilike` «contiene el texto»: `%`, `_` y `\` del usuario se tratan como texto (CA-93). */
export function containsPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
