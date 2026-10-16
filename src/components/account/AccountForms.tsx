'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { saveAddressAction, updateProfileAction } from '@/lib/auth/actions';
import { initialFormState } from '@/lib/auth/form-state';
import { FormMessage, SubmitButton, TextField, useFormFocus } from '@/components/forms/fields';

export function ProfileForm({ fullName }: { readonly fullName: string }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const formRef = useFormFocus(state);
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      <FormMessage state={state} />
      <TextField
        name="fullName"
        label="Nombre"
        autoComplete="name"
        defaultValue={state.values?.['fullName'] ?? fullName}
        error={state.fieldErrors?.['fullName']}
      />
      <SubmitButton pendingLabel="Guardando…">Guardar nombre</SubmitButton>
    </form>
  );
}

export interface AddressFormValues {
  readonly id?: string;
  readonly recipientName: string;
  readonly line1: string;
  readonly line2: string;
  readonly postalCode: string;
  readonly city: string;
  readonly province: string;
}

export const emptyAddress: AddressFormValues = {
  recipientName: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  province: '',
};

export function AddressForm({ initial }: { readonly initial: AddressFormValues }) {
  const [state, action] = useActionState(saveAddressAction, initialFormState);
  const formRef = useFormFocus(state);
  const value = (key: Exclude<keyof AddressFormValues, 'id'>): string => state.values?.[key] ?? initial[key];
  return (
    <form ref={formRef} action={action} noValidate className="space-y-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <FormMessage state={state} />
      <TextField
        name="recipientName"
        label="Nombre y apellidos del destinatario"
        autoComplete="name"
        defaultValue={value('recipientName')}
        error={state.fieldErrors?.['recipientName']}
      />
      <TextField
        name="line1"
        label="Dirección"
        autoComplete="address-line1"
        defaultValue={value('line1')}
        error={state.fieldErrors?.['line1']}
      />
      <TextField
        name="line2"
        label="Piso, puerta, escalera"
        autoComplete="address-line2"
        required={false}
        defaultValue={value('line2')}
        error={state.fieldErrors?.['line2']}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="postalCode"
          label="Código postal"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={5}
          defaultValue={value('postalCode')}
          error={state.fieldErrors?.['postalCode']}
        />
        <TextField
          name="city"
          label="Población"
          autoComplete="address-level2"
          defaultValue={value('city')}
          error={state.fieldErrors?.['city']}
        />
      </div>
      <TextField
        name="province"
        label="Provincia"
        autoComplete="address-level1"
        defaultValue={value('province')}
        error={state.fieldErrors?.['province']}
      />
      <p className="text-sm text-fg-muted">Solo hacemos envíos a España.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingLabel="Guardando…">Guardar dirección</SubmitButton>
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong px-6 text-sm font-semibold text-fg hover:bg-accent-soft"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
