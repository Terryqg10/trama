import { z } from 'zod';
import { validatePassword } from '@/lib/password';
import { requiredString } from '@/lib/zod-helpers';

/**
 * Esquemas de entrada de cuenta (RF-04, RF-05). Todo dato del formulario se valida aquí,
 * en el servidor, antes de llegar a Supabase. Los tipos se derivan con `z.infer`.
 */

const REQUIRED = 'Este campo es obligatorio.';

const email = requiredString(REQUIRED)
  .trim()
  .toLowerCase()
  .min(1, REQUIRED)
  .max(254, 'El email es demasiado largo.')
  .email('Introduce un email válido.');

// 72 bytes es el límite de bcrypt, que usa Supabase Auth. Además de la longitud, la fortaleza se valida con la función del OS
// (invariante I10, CA-154): se rechaza el nivel «débil» (sin letras, sin números o demasiado corta). Solo se aplica al fijar una
// contraseña (registro y restablecimiento); el acceso no cambia, así que las cuentas existentes siguen entrando.
const newPassword = requiredString(REQUIRED)
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .superRefine((value, ctx) => {
    const strength = validatePassword(value);
    if (!strength.valida) ctx.addIssue({ code: 'custom', message: strength.mensaje });
  });

const text = (max: number) =>
  requiredString(REQUIRED)
    .trim()
    .min(1, REQUIRED)
    .max(max, `Máximo ${max} caracteres.`);

export const registerSchema = z.object({
  fullName: text(120),
  email,
  password: newPassword,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: requiredString(REQUIRED).min(1, REQUIRED).max(72, 'Contraseña demasiado larga.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recoverySchema = z.object({ email });
export type RecoveryInput = z.infer<typeof recoverySchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirm: requiredString(REQUIRED).min(1, REQUIRED),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden.',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({ fullName: text(120) });
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Dirección de envío. Refleja los CHECK de `public.addresses` (T-003): código postal de
 * 5 dígitos y país `ES`. El país no viene del formulario: se fija en el servidor.
 */
export const addressSchema = z.object({
  recipientName: text(120),
  line1: text(200),
  line2: z
    .string()
    .trim()
    .max(200, 'Máximo 200 caracteres.')
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value)),
  postalCode: requiredString(REQUIRED)
    .trim()
    .regex(/^[0-9]{5}$/, 'El código postal debe tener 5 dígitos.'),
  city: text(100),
  province: text(100),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const addressIdSchema = z.string().uuid();

/** A dónde puede volver el inicio de sesión (lista blanca: nunca una URL arbitraria). */
export const nextPathSchema = z.union([
  z.literal('/checkout'),
  // Volver a la ficha de un producto para dejarlo en favoritos (CA-76, T-042): solo `/producto/<slug>?favorito=1`.
  z.string().regex(/^\/producto\/[a-z0-9]+(?:-[a-z0-9]+)*\?favorito=1$/).max(200),
  // Volver a un listado tras pulsar el corazón de una tarjeta (CA-147, T-115): solo esas rutas y una consulta de caracteres seguros.
  z.string().regex(/^\/(?:hombre|mujer|novedades|ofertas|buscar)(?:\?[A-Za-z0-9_=&%.+-]*)?$/).max(200),
]);

/** Errores por campo: el primer mensaje de cada ruta. */
export type FieldErrors = Readonly<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.');
    if (key !== '' && result[key] === undefined) result[key] = issue.message;
  }
  return result;
}

/** Convierte un `FormData` en un objeto plano de textos (ignora archivos). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}
