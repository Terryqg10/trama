// Constantes de tienda (SPEC-001, Enmienda 1). Importes en céntimos (RNF-08).

/** Tarifa plana de envío por debajo del umbral de envío gratis. */
export const SHIPPING_FLAT_CENTS = 495;

/** Total del carrito a partir del cual el envío es gratis. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

/** Plazo de devolución mostrado. Política de ejemplo (VERIFICAR plazos legales). */
export const RETURN_WINDOW_DAYS = 30;

const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

/** Formatea céntimos como euros en es-ES. Rechaza valores no enteros o negativos. */
export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`Importe en céntimos inválido: ${cents}`);
  }
  return euroFormatter.format(cents / 100);
}
