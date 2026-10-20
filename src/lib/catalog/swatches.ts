// Muestras de color de la ficha (SPEC-001 Enmienda 12, ADR-007). Traduce el nombre de un color del
// catálogo a la clase de Tailwind de su token (`--color-swatch-<color>` en src/app/swatches.css).
// Las clases se escriben ENTERAS: Tailwind solo genera las que ve escritas en el código, así que no
// se pueden componer con plantillas de texto.

const SWATCH_CLASS: Readonly<Record<string, string>> = {
  azul: 'bg-swatch-azul',
  beige: 'bg-swatch-beige',
  blanco: 'bg-swatch-blanco',
  burdeos: 'bg-swatch-burdeos',
  gris: 'bg-swatch-gris',
  negro: 'bg-swatch-negro',
  rojo: 'bg-swatch-rojo',
  rosa: 'bg-swatch-rosa',
  verde: 'bg-swatch-verde',
};

/** Colores con muestra (los nombres, en minúsculas, como llegan de la BD). */
export const SWATCH_COLORS: readonly string[] = Object.keys(SWATCH_CLASS);

/** Clase del token de la muestra, o `null` si el color no tiene token (se muestra como chip de texto). */
export function swatchClass(color: string): string | null {
  return Object.hasOwn(SWATCH_CLASS, color) ? (SWATCH_CLASS[color] ?? null) : null;
}
