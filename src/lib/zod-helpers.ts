import { z } from 'zod';

/**
 * Texto obligatorio cuyo «falta» y «no es un texto» dan el mismo mensaje. En Zod 3 eran `required_error` e `invalid_type_error`, que
 * Zod 4 elimina (T-095, ADR-012). Solo ese tipo de fallo lleva el mensaje: los de las comprobaciones (`.min`, `.max`, `.email`…) conservan
 * el suyo, igual que antes.
 */
export function requiredString(message: string) {
  return z.string({ error: (issue) => (issue.code === 'invalid_type' ? message : undefined) });
}
