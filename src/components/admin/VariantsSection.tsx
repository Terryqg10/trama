'use client';

import { useActionState, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FormMessage, useFormFocus } from '@/components/forms/fields';
import { initialFormState } from '@/lib/auth/form-state';
import { deleteVariantAction, saveVariantAction, setProductActiveAction } from '@/lib/admin/product-actions';
import type { AdminVariant } from '@/lib/admin/products';
import { capitalize } from '@/lib/catalog/facets';
import { AdminTextField } from './AdminFields';

const primary =
  'inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-70 md:min-h-(--control-height)';
const secondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft disabled:opacity-70 md:min-h-(--control-height)';
const inputClass =
  'block w-full min-h-11 rounded-control border border-border-strong bg-surface px-3 text-sm text-fg tabular aria-[invalid=true]:border-danger md:min-h-(--control-height)';

function centsToEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${euros},${rest}`;
}

/** Fila de una variante: edita precio y stock, o la elimina. La talla y el color la identifican. */
function VariantRow({ productId, variant }: { readonly productId: string; readonly variant: AdminVariant }) {
  const [state, action] = useActionState(saveVariantAction, initialFormState);
  const [deleteState, deleteAction] = useActionState(deleteVariantAction, initialFormState);
  const [confirming, setConfirming] = useState(false);
  const formRef = useFormFocus(state);
  const label = `${capitalize(variant.color)}, talla ${variant.size}`;
  const id = `variante-${variant.id}`;

  return (
    <li data-testid="variant-row" className="px-4 py-3">
      <form ref={formRef} action={action} noValidate className="grid items-start gap-3 md:grid-cols-12">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variant.id} />
        <div className="md:col-span-4">
          <p className="text-sm font-medium">{capitalize(variant.color)}</p>
          <p className="text-xs text-fg-muted">Talla {variant.size}</p>
        </div>
        <div className="md:col-span-3">
          <label htmlFor={`${id}-precio`} className="block text-xs font-medium text-fg-muted">
            Precio (€)
          </label>
          <input
            id={`${id}-precio`}
            name="price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            required
            aria-label={`Precio de ${label}`}
            defaultValue={state.values?.['price'] ?? centsToEuros(variant.priceCents)}
            aria-invalid={state.fieldErrors?.['price'] ? true : undefined}
            aria-describedby={state.fieldErrors?.['price'] ? `${id}-precio-error` : undefined}
            className={inputClass}
          />
          {state.fieldErrors?.['price'] ? (
            <p id={`${id}-precio-error`} className="mt-1 text-xs font-medium text-danger">
              {state.fieldErrors['price']}
            </p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`${id}-stock`} className="block text-xs font-medium text-fg-muted">
            Stock
          </label>
          <input
            id={`${id}-stock`}
            name="stock"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            aria-label={`Stock de ${label}`}
            defaultValue={state.values?.['stock'] ?? String(variant.stock)}
            aria-invalid={state.fieldErrors?.['stock'] ? true : undefined}
            aria-describedby={state.fieldErrors?.['stock'] ? `${id}-stock-error` : undefined}
            className={inputClass}
          />
          {state.fieldErrors?.['stock'] ? (
            <p id={`${id}-stock-error`} className="mt-1 text-xs font-medium text-danger">
              {state.fieldErrors['stock']}
            </p>
          ) : null}
        </div>
        <div className="flex items-end gap-2 md:col-span-3 md:justify-end md:self-end">
          <button type="submit" aria-label={`Guardar ${label}`} className={primary}>
            Guardar
          </button>
        </div>
        <div className="md:col-span-12" aria-live="polite">
          {state.status !== 'idle' && state.message ? <FormMessage state={state} /> : null}
        </div>
      </form>

      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variant.id} />
        {confirming ? (
          <>
            <span className="text-xs font-medium text-danger">¿Eliminar la variante {label}?</span>
            <button type="submit" className={secondary}>
              Sí, eliminar
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondary}>
              Volver
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Eliminar ${label}`} className={secondary}>
            <Trash2 aria-hidden="true" className="size-4" />
            Eliminar
          </button>
        )}
        {deleteState.status === 'error' && deleteState.message ? (
          <span role="alert" className="text-xs font-medium text-danger">
            {deleteState.message}
          </span>
        ) : null}
      </form>
    </li>
  );
}

function AddVariantForm({ productId }: { readonly productId: string }) {
  const [state, action] = useActionState(saveVariantAction, initialFormState);
  const formRef = useFormFocus(state);
  // Tras añadir con éxito se vacía el formulario cambiando su clave.
  const resetKey = state.status === 'success' ? `ok-${state.message}` : 'editando';

  return (
    <form key={resetKey} ref={formRef} action={action} noValidate className="space-y-3 px-4 py-4">
      <h3 className="text-sm font-semibold">Añadir variante</h3>
      <input type="hidden" name="productId" value={productId} />
      <FormMessage state={state} />
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <AdminTextField name="size" label="Talla" defaultValue={state.values?.['size']} error={state.fieldErrors?.['size']} maxLength={10} />
        </div>
        <div className="md:col-span-3">
          <AdminTextField name="color" label="Color" defaultValue={state.values?.['color']} error={state.fieldErrors?.['color']} maxLength={40} />
        </div>
        <div className="md:col-span-3">
          <AdminTextField name="price" label="Precio (€)" defaultValue={state.values?.['price']} error={state.fieldErrors?.['price']} inputMode="decimal" />
        </div>
        <div className="md:col-span-3">
          <AdminTextField name="stock" label="Stock" defaultValue={state.values?.['stock']} error={state.fieldErrors?.['stock']} inputMode="numeric" />
        </div>
      </div>
      <button type="submit" className={primary}>
        Añadir variante
      </button>
    </form>
  );
}

/** Variantes y stock del producto (RF-09): una fila por variante y un formulario para añadir otra. */
export function VariantsSection({ productId, variants }: { readonly productId: string; readonly variants: readonly AdminVariant[] }) {
  return (
    <section aria-labelledby="titulo-variantes" className="overflow-clip rounded-container border border-border bg-surface">
      <h2 id="titulo-variantes" className="border-b border-border px-4 py-3 text-lg font-semibold">
        Variantes y stock
      </h2>
      {variants.length === 0 ? (
        <p className="px-4 py-6 text-sm text-fg-muted">
          Este producto aún no tiene variantes. Hasta que añadas una, no se podrá comprar.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {variants.map((variant) => (
            <VariantRow key={variant.id} productId={productId} variant={variant} />
          ))}
        </ul>
      )}
      <div className="border-t border-border bg-surface-muted">
        <AddVariantForm productId={productId} />
      </div>
    </section>
  );
}

/** Baja (desactivar) y reactivación del producto. */
export function ProductActiveForm({ productId, active }: { readonly productId: string; readonly active: boolean }) {
  const [state, action] = useActionState(setProductActiveAction, initialFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="active" value={active ? 'false' : 'true'} />
      <div className="flex flex-wrap items-center gap-2">
        {!active ? (
          <button type="submit" className={primary}>
            Reactivar producto
          </button>
        ) : confirming ? (
          <>
            <span className="text-sm font-medium text-danger">¿Desactivar? Dejará de verse en la tienda.</span>
            <button type="submit" className={secondary}>
              Sí, desactivar
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondary}>
              Volver
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={secondary}>
            Desactivar producto
          </button>
        )}
      </div>
      <div aria-live="polite">
        {state.status !== 'idle' && state.message ? (
          <p role={state.status === 'error' ? 'alert' : 'status'} className={`text-sm font-medium ${state.status === 'error' ? 'text-danger' : 'text-success'}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
