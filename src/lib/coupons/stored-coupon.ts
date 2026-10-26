import { z } from 'zod';

/**
 * Código aplicado en el carrito lateral, guardado en `sessionStorage` para que el pago lo recoja (CA-151, T-120). Es solo una
 * comodidad de pantalla: el pago vuelve a validar el texto en el servidor y recalcula todo, así que lo guardado no fija ningún
 * precio. Todas las lecturas y escrituras van en `try/catch` (almacenamiento bloqueado o lleno) y se validan con Zod.
 */

export const COUPON_STORAGE_KEY = 'trama.coupon.v1';

const storedCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(20),
  percentOff: z.number().int().min(1).max(100),
});
export type StoredCoupon = z.infer<typeof storedCouponSchema>;

export function readStoredCoupon(): StoredCoupon | null {
  try {
    const raw = window.sessionStorage.getItem(COUPON_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = storedCouponSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredCoupon(coupon: StoredCoupon): void {
  try {
    window.sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
  } catch {
    // Sin almacenamiento el código solo vale en esta pantalla.
  }
}

export function clearStoredCoupon(): void {
  try {
    window.sessionStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    // Nada que limpiar.
  }
}
