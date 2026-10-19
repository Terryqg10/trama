'use client';

import { useId, type ReactNode } from 'react';

/**
 * Campos de formulario del panel (estilo v4): etiqueta visible, ayuda opcional y error por campo enlazado con
 * `aria-describedby`. Altura de 44 px en móvil y de `--control-height` (36 px) en escritorio.
 */

const control =
  'block w-full min-h-11 rounded-control border border-border-strong bg-surface px-3 text-sm text-fg aria-[invalid=true]:border-danger md:min-h-(--control-height)';

interface FieldShellProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly optional?: boolean | undefined;
  readonly children: ReactNode;
}

function FieldShell({ id, label, hint, error, optional, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {optional ? <span className="font-normal text-fg-muted"> (opcional)</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint: string | undefined, error: string | undefined): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return ids || undefined;
}

export function AdminTextField({
  name,
  label,
  defaultValue,
  error,
  hint,
  optional,
  inputMode,
  autoComplete = 'off',
  onChange,
  maxLength,
}: {
  readonly name: string;
  readonly label: string;
  readonly defaultValue?: string | undefined;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly optional?: boolean | undefined;
  readonly inputMode?: 'numeric' | 'decimal' | 'text' | undefined;
  readonly autoComplete?: string | undefined;
  readonly onChange?: ((value: string) => void) | undefined;
  readonly maxLength?: number | undefined;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        name={name}
        type="text"
        defaultValue={defaultValue}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={control}
      />
    </FieldShell>
  );
}

export function AdminTextarea({
  name,
  label,
  defaultValue,
  error,
  hint,
  optional,
  rows = 3,
}: {
  readonly name: string;
  readonly label: string;
  readonly defaultValue?: string | undefined;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly optional?: boolean | undefined;
  readonly rows?: number | undefined;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} py-2`}
      />
    </FieldShell>
  );
}

export function AdminSelect({
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  readonly name: string;
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly defaultValue?: string | undefined;
  readonly error?: string | undefined;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ''}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, undefined, error)}
        className={control}
      >
        <option value="" disabled>
          Elige…
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function AdminCheckbox({
  name,
  label,
  defaultChecked,
}: {
  readonly name: string;
  readonly label: string;
  readonly defaultChecked?: boolean | undefined;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-sm font-medium text-fg md:min-h-(--control-height)">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-5 accent-accent md:size-4" />
      {label}
    </label>
  );
}
