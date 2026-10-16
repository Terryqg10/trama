import type { ProductDetail } from './product';

// Datos de ajuste de la ficha (SPEC-001 RF-20): altura y talla del modelo, composición y cuidados.
// Todo es opcional en la BD; solo se muestra lo que tiene dato.

const heightFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface FitInfoData {
  /** «Mide 1,85 m y lleva la talla M», o solo una de las dos partes; `null` si no hay ninguna. */
  readonly model: string | null;
  readonly composition: string | null;
  readonly care: string | null;
}

function clean(text: string | null): string | null {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Altura en metros con coma decimal (es-ES): 185 → «1,85 m». Una altura no válida se omite. */
export function formatModelHeight(heightCm: number): string | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  return `${heightFormatter.format(heightCm / 100)} m`;
}

/** Frase sobre el modelo, con lo que haya: altura, talla o ambas. */
export function modelSentence(heightCm: number | null, size: string | null): string | null {
  const height = heightCm === null ? null : formatModelHeight(heightCm);
  const talla = clean(size);
  if (height && talla) return `Mide ${height} y lleva la talla ${talla}`;
  if (height) return `Mide ${height}`;
  if (talla) return `Lleva la talla ${talla}`;
  return null;
}

/** Datos de ajuste de un producto, o `null` si no tiene ninguno (entonces no se pinta el bloque). */
export function fitInfoOf(
  product: Pick<ProductDetail, 'modelHeightCm' | 'modelSize' | 'composition' | 'care'>,
): FitInfoData | null {
  const data: FitInfoData = {
    model: modelSentence(product.modelHeightCm, product.modelSize),
    composition: clean(product.composition),
    care: clean(product.care),
  };
  return data.model || data.composition || data.care ? data : null;
}
