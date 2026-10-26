import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

/**
 * Token de confirmación de la newsletter (CA-103, T-061, Enmienda 50): 32 bytes aleatorios de `crypto` en base64url (43
 * caracteres). En la base de datos solo se guarda su hash SHA-256: quien lea la tabla no puede confirmar nada. Caduca a las
 * 24 horas y es de un solo uso (al confirmar se borra el hash).
 */

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Lo que llega del navegador (el enlace): forma exacta de un token, nada más. */
export const confirmTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** `random(n)` devuelve n bytes aleatorios: inyectable para las pruebas. */
export function generateConfirmToken(random: (size: number) => Buffer = randomBytes): string {
  return random(32).toString('base64url');
}

export function hashConfirmToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenExpiry(now: number): string {
  return new Date(now + TOKEN_TTL_MS).toISOString();
}
