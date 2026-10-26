import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

// CA-152 (T-120, nivel unitario): 3 intentos por minuto por clave, ventana deslizante y memoria acotada.

const MINUTE = 60_000;

describe('createRateLimiter (CA-152)', () => {
  it('permite 3 intentos y rechaza el cuarto con el tiempo que falta', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: MINUTE });
    expect(limiter.check('a', 0)).toEqual({ allowed: true });
    expect(limiter.check('a', 10_000)).toEqual({ allowed: true });
    expect(limiter.check('a', 20_000)).toEqual({ allowed: true });
    expect(limiter.check('a', 30_000)).toEqual({ allowed: false, retryAfterMs: 30_000 });
  });

  it('un intento rechazado no cuenta: pasado el minuto del primero vuelve a poder', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: MINUTE });
    for (const time of [0, 10_000, 20_000]) limiter.check('a', time);
    expect(limiter.check('a', 59_999).allowed).toBe(false);
    expect(limiter.check('a', 60_001)).toEqual({ allowed: true });
    expect(limiter.check('a', 60_002).allowed).toBe(false);
  });

  it('cada clave tiene su propio contador', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: MINUTE });
    for (const time of [0, 1, 2]) limiter.check('a', time);
    expect(limiter.check('a', 3).allowed).toBe(false);
    expect(limiter.check('b', 3)).toEqual({ allowed: true });
  });

  it('acota la memoria: con más claves que el máximo caen las más antiguas', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: MINUTE, maxKeys: 3 });
    for (const key of ['a', 'b', 'c', 'd']) limiter.check(key, 0);
    // «a» se descartó para dejar sitio: vuelve a tener un intento libre aunque siga dentro de la ventana.
    expect(limiter.check('a', 1)).toEqual({ allowed: true });
    expect(limiter.check('d', 1).allowed).toBe(false);
  });
});
