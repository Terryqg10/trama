/**
 * Resultado de «Aplicar» un código de descuento en el pago (RF-27, CA-137, T-093). Solo es una vista previa para la
 * pantalla: el descuento real lo vuelve a calcular el servidor al pagar, a partir del texto del código.
 */
export interface CouponPreviewState {
  readonly status: 'idle' | 'applied' | 'error';
  readonly message?: string;
  /** Código normalizado (mayúsculas, sin espacios) cuando se ha aplicado. */
  readonly code?: string;
  readonly discountCents?: number;
  /** Porcentaje del cupón: el carrito lateral recalcula el descuento con él cuando cambia el carrito (CA-151). */
  readonly percentOff?: number;
  readonly totalCents?: number;
}

export const initialCouponPreview: CouponPreviewState = { status: 'idle' };
