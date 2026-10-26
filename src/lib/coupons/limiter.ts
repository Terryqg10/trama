import { createRateLimiter } from '@/lib/rate-limit';

/** Intentos de código de descuento permitidos por cuenta y por minuto (CA-152). */
export const COUPON_ATTEMPTS_PER_MINUTE = 3;

/** Un único contador para todo lo que comprueba códigos (carrito lateral y pago), así el tope no se esquiva cambiando de pantalla. */
export const couponAttemptLimiter = createRateLimiter({ limit: COUPON_ATTEMPTS_PER_MINUTE, windowMs: 60_000 });
