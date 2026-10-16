'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/auth/form-state';

const inputClass =
  'block min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-fg aria-[invalid=true]:border-danger';
const primaryButton =
  'inline-flex min-h-11 w-full items-center justify-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-70 sm:w-auto';

interface TextFieldProps {
  readonly name: string;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly autoComplete?: string;
  readonly defaultValue?: string;
  readonly error?: string | undefined;
  readonly hint?: string;
  readonly required?: boolean;
  readonly inputMode?: 'numeric' | 'text' | 'email';
  readonly maxLength?: number;
}

/** Campo con etiqueta visible, ayuda opcional y error por campo enlazado con `aria-describedby`. */
export function TextField({
  name,
  label,
  type = 'text',
  autoComplete,
  defaultValue,
  error,
  hint,
  required = true,
  inputMode,
  maxLength,
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {required ? null : <span className="font-normal text-fg-muted"> (opcional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1 ${inputClass}`}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, pendingLabel }: { readonly children: string; readonly pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Mensaje del formulario: error con `role="alert"`, éxito con `role="status"`. */
export function FormMessage({ state }: { readonly state: FormState }) {
  if (state.status === 'idle' || !state.message) return null;
  const isError = state.status === 'error';
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`rounded-control border px-4 py-3 text-sm font-medium ${
        isError ? 'border-danger text-danger' : 'border-success text-success'
      }`}
    >
      {state.message}
    </p>
  );
}

/** Tras un envío con errores, lleva el foco al primer campo inválido. */
export function useFocusFirstInvalid(formRef: RefObject<HTMLFormElement | null>, state: FormState): void {
  useEffect(() => {
    if (state.status !== 'error') return;
    const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
  }, [state, formRef]);
}

/** Atajo: referencia al formulario más foco en el primer error. */
export function useFormFocus(state: FormState): RefObject<HTMLFormElement | null> {
  const formRef = useRef<HTMLFormElement | null>(null);
  useFocusFirstInvalid(formRef, state);
  return formRef;
}
