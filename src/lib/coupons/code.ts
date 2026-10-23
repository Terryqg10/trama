import { randomInt } from 'node:crypto';
import { z } from 'zod';

/**
 * Código del cupón de bienvenida (RF-27, CA-135, T-093, Enmienda 41): `TRAMA-XXXX-XXXX` con un alfabeto sin caracteres
 * ambiguos (sin 0, 1, I, L ni O) para que se lea y se teclee sin errores. Se genera con `crypto` (no con `Math.random`).
 * El patrón es el mismo que fuerza la restricción `welcome_coupons_code_check` de la base de datos.
 */

export const COUPON_PERCENT_OFF = 10;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_LENGTH = 4;

export const COUPON_CODE_PATTERN = /^TRAMA-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/** `random(max)` devuelve un entero uniforme en [0, max): inyectable para las pruebas. */
export function generateCouponCode(random: (max: number) => number = (max) => randomInt(max)): string {
  const group = (): string =>
    Array.from({ length: GROUP_LENGTH }, () => ALPHABET.charAt(random(ALPHABET.length))).join('');
  return `TRAMA-${group()}-${group()}`;
}

/** Lo que escribe el cliente: sin espacios alrededor y en mayúsculas. Cualquier otra forma se rechaza. */
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(COUPON_CODE_PATTERN, 'Ese código no es válido.');
