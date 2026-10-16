import type { FieldErrors } from './schemas';

/** Estado devuelto por las acciones de formulario (se muestra con `useActionState`). */
export interface FormState {
  readonly status: 'idle' | 'error' | 'success';
  readonly message?: string;
  readonly fieldErrors?: FieldErrors;
  /** Valores no sensibles para repoblar el formulario tras un error. Nunca contraseñas. */
  readonly values?: Readonly<Record<string, string>>;
}

export const initialFormState: FormState = { status: 'idle' };

/** Copia solo los campos permitidos (lista blanca) para devolverlos al formulario. */
export function pickValues(
  source: Readonly<Record<string, string>>,
  keys: readonly string[],
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}
