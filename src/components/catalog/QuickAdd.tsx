'use client';

import Image from 'next/image';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { capitalize } from '@/lib/catalog/facets';
import { isPhotoPath } from '@/lib/catalog/image-path';
import type { ProductImage } from '@/lib/catalog/product';
import { imageForColor, type QuickAddColor } from '@/lib/catalog/quick-add';
import { swatchClass } from '@/lib/catalog/swatches';

/**
 * Controles de compra de la tarjeta (CA-121, T-081, Enmienda 34): miniaturas de color, tallas y «Añadir a la cesta»
 * **debajo de la foto**, siempre visibles desde `--bp-md` (768 px). El color elegido lo comparten la imagen
 * (`CardImage`) y los controles (`QuickAdd`) a través de un contexto, así que la tarjeta sigue siendo un componente de
 * servidor que solo monta estos trozos de cliente.
 */
interface CardColor {
  readonly color: string;
  readonly setColor: (color: string) => void;
}

const CardColorContext = createContext<CardColor | null>(null);

function useCardColor(): CardColor {
  const value = useContext(CardColorContext);
  if (!value) throw new Error('CardImage y QuickAdd van dentro de CardColorProvider');
  return value;
}

export function CardColorProvider({ defaultColor, children }: { readonly defaultColor: string; readonly children: ReactNode }) {
  const [color, setColor] = useState(defaultColor);
  return <CardColorContext value={{ color, setColor }}>{children}</CardColorContext>;
}

/** Imagen principal de la tarjeta: la del color elegido (la que acaba en «color <nombre>») o la primera. */
export function CardImage({ images, priority }: { readonly images: readonly ProductImage[]; readonly priority: boolean }) {
  const { color } = useCardColor();
  const image = imageForColor(images, color);
  if (!image) return <p className="flex h-full items-center justify-center text-sm text-fg-muted">Sin imagen</p>;
  return (
    <Image
      src={image.path}
      alt={image.alt}
      width={400}
      height={500}
      unoptimized
      // `priority` de Next está obsoleto desde la 16 y solo quita el `lazy`: la carga con prioridad es `preload` y
      // `fetchPriority="high"` (T-015).
      preload={priority}
      fetchPriority={priority ? 'high' : undefined}
      loading={priority ? 'eager' : undefined}
      data-testid="card-image"
      className={
        isPhotoPath(image.path)
          ? 'h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105'
          : 'h-full w-full object-contain p-6 transition-transform duration-500 motion-safe:group-hover:scale-105'
      }
    />
  );
}

export function QuickAdd({
  productName,
  colors,
  signedIn,
}: {
  readonly productName: string;
  readonly colors: readonly QuickAddColor[];
  readonly signedIn: boolean;
}) {
  const { color, setColor } = useCardColor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sizes = colors.find((candidate) => candidate.color === color)?.sizes ?? [];
  const selected = sizes.find((size) => size.variantId === selectedId) ?? null;

  function chooseColor(next: string): void {
    setColor(next);
    setSelectedId(null);
  }

  return (
    <div data-testid="quick-add" className="relative z-10 mt-auto hidden space-y-3 pt-3 md:block">
      {colors.length > 1 ? (
        <div role="group" aria-label={`Color de ${productName}`} className="-mx-1.5 flex flex-wrap">
          {colors.map((item) => {
            const active = item.color === color;
            const swatch = swatchClass(item.color);
            return (
              <button
                key={item.color}
                type="button"
                aria-pressed={active}
                aria-label={`Color ${capitalize(item.color)}`}
                title={capitalize(item.color)}
                data-testid="quick-add-color"
                onClick={() => chooseColor(item.color)}
                className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <span
                  aria-hidden="true"
                  className={`size-6 rounded-full border ${active ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'border-border-strong'} ${swatch ?? 'bg-surface-muted'}`}
                />
              </button>
            );
          })}
        </div>
      ) : null}
      <div role="group" aria-label={`Talla de ${productName}`} className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const soldOut = size.stock <= 0;
          const active = size.variantId === selectedId;
          return (
            <button
              key={size.variantId}
              type="button"
              disabled={soldOut}
              aria-pressed={active}
              aria-label={soldOut ? `Talla ${size.size}, agotada` : `Talla ${size.size}`}
              data-testid="quick-add-size"
              onClick={() => setSelectedId(size.variantId)}
              className={`inline-flex size-11 items-center justify-center rounded-control border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                active
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-border-strong bg-surface text-fg hover:bg-accent-soft'
              }`}
            >
              {size.size}
            </button>
          );
        })}
      </div>
      <AddToCartButton
        variantId={selected?.variantId ?? null}
        stock={selected?.stock ?? 0}
        productName={productName}
        signedIn={signedIn}
        testId="quick-add-button"
        hideHint
        fullWidth
        label={selected ? 'Añadir a la cesta' : 'Elige talla'}
      />
    </div>
  );
}
