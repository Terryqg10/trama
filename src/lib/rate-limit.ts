/**
 * Límite de intentos con ventana deslizante, en memoria (CA-152, T-120). Cada clave guarda las marcas de tiempo de sus
 * intentos dentro de la ventana; si ya hay `limit`, el siguiente se rechaza sin contarse. Sirve para la demo: el contador
 * vive en la memoria de cada instancia del servidor, así que con varias instancias el tope efectivo sería mayor. En
 * producción real se sustituye por un almacén compartido (p. ej. Upstash Redis con `@upstash/ratelimit`), con la misma
 * interfaz. La memoria está acotada: se descartan las claves con la ventana vacía y, si aun así se supera `maxKeys`, las
 * más antiguas.
 */

export type RateLimitResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterMs: number };

export interface RateLimiter {
  /** Cuenta un intento de `key`. `now` es inyectable para las pruebas. */
  readonly check: (key: string, now?: number) => RateLimitResult;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  readonly limit: number;
  readonly windowMs: number;
  readonly maxKeys?: number;
}): RateLimiter {
  const attempts = new Map<string, number[]>();

  function prune(now: number): void {
    for (const [key, times] of attempts) {
      if (times.every((time) => time <= now - windowMs)) attempts.delete(key);
    }
    // Las claves se guardan en orden de inserción: si sigue habiendo demasiadas, caen las más antiguas.
    for (const key of attempts.keys()) {
      if (attempts.size <= maxKeys) break;
      attempts.delete(key);
    }
  }

  return {
    check(key, now = Date.now()) {
      const recent = (attempts.get(key) ?? []).filter((time) => time > now - windowMs);
      if (recent.length >= limit) {
        const oldest = recent[0] ?? now;
        attempts.set(key, recent);
        return { allowed: false, retryAfterMs: Math.max(oldest + windowMs - now, 0) };
      }
      recent.push(now);
      // `delete` + `set` deja la clave al final del orden de inserción (la más reciente).
      attempts.delete(key);
      attempts.set(key, recent);
      if (attempts.size > maxKeys) prune(now);
      return { allowed: true };
    },
  };
}
