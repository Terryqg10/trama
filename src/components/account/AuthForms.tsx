'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  loginAction,
  recoverAction,
  registerAction,
  resetPasswordAction,
} from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';
import { FormMessage, SubmitButton, TextField, useFormFocus } from '@/components/forms/fields';
import { useSavedCart } from '@/lib/cart/store';

/** Campo oculto con el carrito del navegador: el servidor lo fusiona con el de la cuenta al entrar (CA-04). */
function GuestCartField() {
  const guestCart = useSavedCart();
  return <input type="hidden" name="guestCart" value={JSON.stringify(guestCart)} />;
}

const linkClass = 'font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover';

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialFormState);
  const formRef = useFormFocus(state);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      <GuestCartField />
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.['email']}
        error={state.fieldErrors?.['email']}
      />
      <TextField
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.['password']}
      />
      <SubmitButton pendingLabel="Entrando…">Iniciar sesión</SubmitButton>
      <p className="text-sm text-fg-muted">
        <Link href="/recuperar" className={linkClass}>
          ¿Has olvidado tu contraseña?
        </Link>
      </p>
      <p className="text-sm text-fg-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className={linkClass}>
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initialFormState);
  const formRef = useFormFocus(state);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      <GuestCartField />
      <FormMessage state={state} />
      <TextField
        name="fullName"
        label="Nombre"
        autoComplete="name"
        defaultValue={state.values?.['fullName']}
        error={state.fieldErrors?.['fullName']}
      />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.['email']}
        error={state.fieldErrors?.['email']}
      />
      <TextField
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint="Entre 8 y 72 caracteres."
        error={state.fieldErrors?.['password']}
      />
      <SubmitButton pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="text-sm text-fg-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/acceso" className={linkClass}>
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function RecoverForm() {
  const [state, action] = useActionState(recoverAction, initialFormState);
  const formRef = useFormFocus(state);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.['email']}
        error={state.fieldErrors?.['email']}
      />
      <SubmitButton pendingLabel="Enviando…">Enviar enlace</SubmitButton>
      <p className="text-sm text-fg-muted">
        <Link href="/acceso" className={linkClass}>
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  const formRef = useFormFocus(state);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        hint="Entre 8 y 72 caracteres."
        error={state.fieldErrors?.['password']}
      />
      <TextField
        name="confirm"
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.['confirm']}
      />
      <SubmitButton pendingLabel="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
