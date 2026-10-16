import Link from 'next/link';
import { Check } from 'lucide-react';
import { capitalize } from '@/lib/catalog/facets';
import type { VariantSelection } from '@/lib/catalog/variant-selection';
import { formatEuros } from '@/lib/domain/shop';

const chip =
  'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border px-4 text-sm';
const chipIdle =
  'border-border-strong bg-surface text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const chipSelected =
  'border-accent bg-accent font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const chipDisabled = 'cursor-not-allowed border-border bg-surface-muted text-fg-muted line-through';

/**
 * Selección de color y talla en la ficha (RF-02, CA-03). Son enlaces a la misma ficha con
 * `?color=` y `?talla=`: funcionan sin JavaScript. Una talla sin stock se muestra deshabilitada
 * (`aria-disabled`, tachada y con el texto «agotada») y no es un enlace, así que no se puede elegir.
 * La talla elegida lleva una marca además del color (WCAG AA). Al cambiar de color se vuelve a
 * elegir la talla: las tallas con stock dependen del color.
 */
export function VariantSelector({
  slug,
  selection,
}: {
  readonly slug: string;
  readonly selection: VariantSelection;
}) {
  const href = (color: string, size: string | null) => ({
    pathname: `/producto/${slug}` as const,
    query: size ? { color, talla: size } : { color },
  });

  return (
    <div className="space-y-6">
      <div role="group" aria-labelledby="ficha-color">
        <p id="ficha-color" className="mb-2 text-sm font-semibold text-fg">
          Color: <span className="font-normal text-fg-muted">{capitalize(selection.color)}</span>
        </p>
        <ul className="flex flex-wrap gap-2">
          {selection.colors.map((color) => {
            const selected = color === selection.color;
            return (
              <li key={color}>
                <Link
                  href={href(color, selected ? selection.size : null)}
                  scroll={false}
                  aria-current={selected ? 'true' : undefined}
                  className={`${chip} ${selected ? chipSelected : chipIdle} ${selected ? 'pl-9' : ''}`}
                >
                  {selected ? (
                    <Check aria-hidden="true" className="absolute left-3 size-4 text-accent-fg" />
                  ) : null}
                  {capitalize(color)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div role="group" aria-labelledby="ficha-talla">
        <p id="ficha-talla" className="mb-2 text-sm font-semibold text-fg">
          Talla
          {selection.size ? (
            <>
              : <span className="font-normal text-fg-muted">{selection.size}</span>
            </>
          ) : null}
        </p>
        <ul className="flex flex-wrap gap-2">
          {selection.sizes.map((option) => {
            const selected = option.size === selection.size;
            if (!option.available) {
              return (
                <li key={option.size}>
                  <span aria-disabled="true" className={`${chip} ${chipDisabled}`}>
                    {option.size}
                    <span className="sr-only"> (agotada)</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={option.size}>
                <Link
                  href={href(selection.color, option.size)}
                  scroll={false}
                  aria-current={selected ? 'true' : undefined}
                  className={`${chip} ${selected ? chipSelected : chipIdle} ${selected ? 'pl-9' : ''}`}
                >
                  {selected ? (
                    <Check aria-hidden="true" className="absolute left-3 size-4 text-accent-fg" />
                  ) : null}
                  {option.size}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p aria-live="polite" className="text-sm text-fg" data-testid="variant-status">
        {selection.variant ? (
          <>
            <strong className="font-semibold">En stock</strong> · {formatEuros(selection.variant.priceCents)}{' '}
            (IVA incluido)
          </>
        ) : (
          <span className="text-fg-muted">Elige una talla para ver la disponibilidad.</span>
        )}
      </p>
    </div>
  );
}
