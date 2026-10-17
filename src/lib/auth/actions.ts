'use server';

import { redirect } from 'next/navigation';
import { mergeGuestIntoAccount } from '@/lib/cart/account';
import { requestOrigin } from '@/lib/http/origin';
import { parseSavedCart } from '@/lib/cart/cart';
import { createAuthClient } from '@/lib/supabase/auth-server';
import type { PublicSupabaseClient } from '@/lib/supabase/server';
import { pickValues, type FormState } from './form-state';
import {
  addressIdSchema,
  addressSchema,
  fieldErrors,
  formDataToObject,
  loginSchema,
  nextPathSchema,
  profileSchema,
  recoverySchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas';

const GENERIC_LOGIN_ERROR = 'El email o la contraseña no son correctos.';
const RATE_LIMIT_ERROR = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
const GENERIC_SERVER_ERROR = 'No se ha podido completar la operación. Inténtalo de nuevo.';

const ADDRESS_FIELDS = ['recipientName', 'line1', 'line2', 'postalCode', 'city', 'province'] as const;

function isRateLimited(status: number | undefined, code: string | undefined): boolean {
  return status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit';
}

/**
 * Fusiona con la cuenta el carrito que el navegador envía en el formulario (CA-04). Un fallo no
 * impide entrar: las líneas siguen en el navegador y la página de cuenta lo reintenta.
 * Devuelve `true` si había líneas y quedaron fusionadas.
 */
async function mergeGuestCartOnEntry(
  supabase: PublicSupabaseClient,
  userId: string,
  rawGuestCart: string | undefined,
): Promise<boolean> {
  const guest = parseSavedCart(rawGuestCart ?? null);
  if (guest.length === 0) return false;
  try {
    await mergeGuestIntoAccount(supabase, userId, guest);
    return true;
  } catch (error) {
    console.error('mergeGuestCartOnEntry falló', error instanceof Error ? error.message : 'error desconocido');
    return false;
  }
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error),
      values: pickValues(raw, ['fullName', 'email']),
    };
  }

  const supabase = await createAuthClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=/cuenta`,
    },
  });

  if (error) {
    // Solo código y estado: nunca el email ni la contraseña.
    console.error('registerAction: signUp falló', { status: error.status, code: error.code });
    const values = pickValues(raw, ['fullName', 'email']);
    if (isRateLimited(error.status, error.code)) {
      return { status: 'error', message: RATE_LIMIT_ERROR, values };
    }
    if (error.code === 'weak_password') {
      return {
        status: 'error',
        fieldErrors: { password: 'La contraseña es demasiado débil. Prueba con otra más larga.' },
        values,
      };
    }
    // No se distingue «email ya registrado» de otros fallos: no se revela qué cuentas existen.
    return {
      status: 'error',
      message:
        'No hemos podido crear la cuenta con esos datos. Si ya tienes una, inicia sesión o recupera tu contraseña.',
      values,
    };
  }

  if (data.session && data.user) {
    const merged = await mergeGuestCartOnEntry(supabase, data.user.id, raw['guestCart']);
    redirect(merged ? '/cuenta?carrito=fusionado' : '/cuenta');
  }

  return {
    status: 'success',
    message: 'Te hemos enviado un correo para confirmar tu cuenta. Ábrelo para terminar el registro.',
  };
}

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error),
      values: pickValues(raw, ['email']),
    };
  }

  const supabase = await createAuthClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const values = pickValues(raw, ['email']);
    if (isRateLimited(error.status, error.code)) {
      return { status: 'error', message: RATE_LIMIT_ERROR, values };
    }
    // CA-07: mismo mensaje para email inexistente, contraseña errónea o correo sin confirmar.
    return { status: 'error', message: GENERIC_LOGIN_ERROR, values };
  }

  const merged = await mergeGuestCartOnEntry(supabase, signedIn.user.id, raw['guestCart']);
  const next = nextPathSchema.safeParse(raw['siguiente']);
  const destination = next.success ? next.data : '/cuenta';
  redirect(merged ? `${destination}?carrito=fusionado` : destination);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function recoverAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = recoverySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error),
      values: pickValues(raw, ['email']),
    };
  }

  const supabase = await createAuthClient();
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/recuperar/nueva`,
  });
  if (error) {
    // Solo código y estado: nunca el email.
    console.error('recoverAction: resetPasswordForEmail falló', { status: error.status, code: error.code });
  }

  // CA-59: mismo mensaje exista o no la cuenta. Tampoco se distingue el límite de envíos de
  // correo, que solo se alcanza con cuentas que existen y delataría cuáles son.
  return {
    status: 'success',
    message: 'Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.',
  };
}

export async function resetPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/recuperar?error=enlace');

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === 'weak_password') {
      return {
        status: 'error',
        fieldErrors: { password: 'La contraseña es demasiado débil. Prueba con otra más larga.' },
      };
    }
    if (error.code === 'same_password') {
      return {
        status: 'error',
        fieldErrors: { password: 'La nueva contraseña debe ser distinta de la anterior.' },
      };
    }
    return { status: 'error', message: GENERIC_SERVER_ERROR };
  }

  redirect('/cuenta?aviso=contrasena');
}

export async function updateProfileAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error),
      values: pickValues(raw, ['fullName']),
    };
  }

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/acceso');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', data.user.id);
  if (error) return { status: 'error', message: GENERIC_SERVER_ERROR, values: pickValues(raw, ['fullName']) };

  return { status: 'success', message: 'Nombre actualizado.' };
}

/** Alta (sin `id`) o edición (con `id`) de una dirección de envío del cliente (RF-05, CA-08). */
export async function saveAddressAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = addressSchema.safeParse(raw);
  const idText = raw['id'];
  const id = idText === undefined || idText === '' ? null : addressIdSchema.safeParse(idText);
  if (id !== null && !id.success) return { status: 'error', message: GENERIC_SERVER_ERROR };

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error),
      values: pickValues(raw, ADDRESS_FIELDS),
    };
  }

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/acceso');

  const row = {
    recipient_name: parsed.data.recipientName,
    line1: parsed.data.line1,
    line2: parsed.data.line2,
    postal_code: parsed.data.postalCode,
    city: parsed.data.city,
    province: parsed.data.province,
    country: 'ES',
  };

  if (id === null) {
    const { error } = await supabase.from('addresses').insert({ ...row, user_id: data.user.id });
    if (error) return { status: 'error', message: GENERIC_SERVER_ERROR, values: pickValues(raw, ADDRESS_FIELDS) };
  } else {
    // RLS limita la actualización a las filas del propio usuario; `select` detecta que no hubo ninguna.
    const { data: updated, error } = await supabase
      .from('addresses')
      .update(row)
      .eq('id', id.data)
      .select('id');
    if (error || updated.length === 0) {
      return { status: 'error', message: GENERIC_SERVER_ERROR, values: pickValues(raw, ADDRESS_FIELDS) };
    }
  }

  redirect('/cuenta');
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = addressIdSchema.safeParse(formData.get('id'));
  if (!id.success) redirect('/cuenta');

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/acceso');

  await supabase.from('addresses').delete().eq('id', id.data);
  redirect('/cuenta');
}
