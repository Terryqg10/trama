'use client';

import { useActionState, useState } from 'react';
import { FormMessage, SubmitButton, useFormFocus } from '@/components/forms/fields';
import { initialFormState } from '@/lib/auth/form-state';
import { saveProductAction } from '@/lib/admin/product-actions';
import { slugify } from '@/lib/admin/product-schemas';
import type { AdminProduct } from '@/lib/admin/products';
import { CATEGORIES, GENDERS, OCCASIONS } from '@/lib/catalog/filters';
import { capitalize } from '@/lib/catalog/facets';
import { AdminCheckbox, AdminSelect, AdminTextarea, AdminTextField } from './AdminFields';

const options = (values: readonly string[]) => values.map((value) => ({ value, label: capitalize(value) }));

/**
 * Formulario del producto (RF-09, RF-19, RF-20). Sin `product` crea uno nuevo (y propone el slug a partir del
 * nombre mientras no se haya tocado); con `product` lo edita. Los errores salen por campo.
 */
export function ProductForm({ product }: { readonly product?: AdminProduct }) {
  const [state, action] = useActionState(saveProductAction, initialFormState);
  const formRef = useFormFocus(state);
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(product !== undefined);

  const value = (key: string, fallback: string): string => state.values?.[key] ?? fallback;
  const error = (key: string): string | undefined => state.fieldErrors?.[key];

  return (
    <form ref={formRef} action={action} noValidate className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormMessage state={state} />

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <AdminTextField
            name="name"
            label="Nombre"
            defaultValue={value('name', product?.name ?? '')}
            error={error('name')}
            maxLength={160}
            onChange={(next) => {
              if (!slugTouched) setSlug(slugify(next));
            }}
          />
        </div>
        <div className="md:col-span-6">
          <AdminControlledSlug
            slug={slug}
            error={error('slug')}
            onChange={(next) => {
              setSlugTouched(true);
              setSlug(next);
            }}
          />
        </div>

        <div className="md:col-span-12">
          <AdminTextarea
            name="description"
            label="Descripción"
            defaultValue={value('description', product?.description ?? '')}
            error={error('description')}
            optional
            rows={3}
          />
        </div>

        <div className="md:col-span-4">
          <AdminSelect name="gender" label="Género" options={options(GENDERS)} defaultValue={value('gender', product?.gender ?? '')} error={error('gender')} />
        </div>
        <div className="md:col-span-4">
          <AdminSelect name="category" label="Categoría" options={options(CATEGORIES)} defaultValue={value('category', product?.category ?? '')} error={error('category')} />
        </div>
        <div className="md:col-span-4">
          <AdminSelect name="occasion" label="Ocasión" options={options(OCCASIONS)} defaultValue={value('occasion', product?.occasion ?? '')} error={error('occasion')} />
        </div>

        <div className="md:col-span-6">
          <AdminTextarea name="composition" label="Composición" defaultValue={value('composition', product?.composition ?? '')} error={error('composition')} optional rows={2} />
        </div>
        <div className="md:col-span-6">
          <AdminTextarea name="care" label="Cuidados" defaultValue={value('care', product?.care ?? '')} error={error('care')} optional rows={2} />
        </div>

        <div className="md:col-span-3">
          <AdminTextField
            name="modelHeightCm"
            label="Altura del modelo (cm)"
            defaultValue={value('modelHeightCm', product?.modelHeightCm?.toString() ?? '')}
            error={error('modelHeightCm')}
            optional
            inputMode="numeric"
          />
        </div>
        <div className="md:col-span-3">
          <AdminTextField name="modelSize" label="Talla del modelo" defaultValue={value('modelSize', product?.modelSize ?? '')} error={error('modelSize')} optional maxLength={10} />
        </div>
        <div className="flex items-end md:col-span-3">
          <AdminCheckbox name="isNew" label="Marcar como nuevo" defaultChecked={state.values ? state.values['isNew'] === 'on' : (product?.isNew ?? false)} />
        </div>
      </div>

      <SubmitButton pendingLabel="Guardando…">{product ? 'Guardar producto' : 'Crear producto'}</SubmitButton>
    </form>
  );
}

/** Campo de URL controlado: se propone desde el nombre y la persona puede editarlo. */
function AdminControlledSlug({
  slug,
  error,
  onChange,
}: {
  readonly slug: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor="producto-slug" className="block text-sm font-medium text-fg">
        URL (slug)
      </label>
      <input
        id="producto-slug"
        name="slug"
        type="text"
        value={slug}
        required
        autoComplete="off"
        maxLength={160}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'producto-slug-error producto-slug-hint' : 'producto-slug-hint'}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full min-h-11 rounded-control border border-border-strong bg-surface px-3 text-sm text-fg aria-[invalid=true]:border-danger md:min-h-(--control-height)"
      />
      <p id="producto-slug-hint" className="mt-1 text-xs text-fg-muted">
        Dirección de la ficha: /producto/{slug || 'nombre-del-producto'}. Solo minúsculas, números y guiones.
      </p>
      {error ? (
        <p id="producto-slug-error" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
