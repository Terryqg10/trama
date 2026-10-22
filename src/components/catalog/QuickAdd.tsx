'use client';

import Image from 'next/image';
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { capitalize } from '@/lib/catalog/facets';
import { isPhotoPath } from '@/lib/catalog/image-path';
import type { ProductImage } from '@/lib/catalog/product';
import { imageForColor, type QuickAddColor } from '@/lib/catalog/quick-add';
import { swatchClass } from '@/lib/catalog/swatches';

/**
 * Compra desde la tarjeta del catálogo (CA-122, T-082, Enmiendas 35 y 36). Estado normal limpio: foto, círculos de color,
 * nombre y precio. Desde `--bp-md` (768 px) los círculos son botones que cambian la foto (`ColorDots`) y, al pasar el
 * cursor o con el foco dentro, un panel con las tallas y «Añadir a la cesta» **sube desde el borde inferior de la foto**
 * (`QuickAdd`, dentro del contenedor de la imagen): no mueve el texto de debajo ni cambia el tamaño de la tarjeta. El color
 * elegido lo comparten la imagen (`CardImage`), los círculos y el panel a través de un contexto, así que la tarjeta sigue
 * siendo un componente de servidor que solo monta estos trozos.
 */
interface CardColor {
  readonly color: string;
  readonly setColor: (color: string) => void;
}

const CardColorContext = createContext<CardColor | null>(null);

function useCardColor(): CardColor {
  const value = useContext(CardColorContext);
  if (!value) throw new Error('CardImage, ColorDots y QuickAdd van dentro de CardColorProvider');
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

/**
 * Círculos de color como botones (desde 768 px): zona de 44 px, círculo de 20 px y anillo de acento en el elegido. El margen
 * izquierdo negativo alinea el primer círculo con el borde izquierdo del texto de la tarjeta.
 */
export function ColorDots({ productName, colors }: { readonly productName: string; readonly colors: readonly QuickAddColor[] }) {
  const { color, setColor } = useCardColor();
  return (
    <div
      role="group"
      aria-label={`Color de ${productName}`}
      data-testid="color-dots"
      className="relative z-10 -ml-3 hidden flex-wrap md:flex"
    >
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
            onClick={() => setColor(item.color)}
            className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            <span
              aria-hidden="true"
              className={`size-5 rounded-full border ${active ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'border-border-strong'} ${swatch ?? 'bg-surface-muted'}`}
            />
          </button>
        );
      })}
    </div>
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
  const { color } = useCardColor();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sizes = colors.find((candidate) => candidate.color === color)?.sizes ?? [];
  // La talla elegida solo vale mientras siga existiendo en el color actual (al cambiar de color se pierde).
  const selected = sizes.find((size) => size.variantId === pickedId) ?? null;

  // Tras Esc, el panel vuelve a poder verse cuando el puntero o el foco salen de la tarjeta (WCAG 1.4.13).
  useEffect(() => {
    const card = panelRef.current?.closest('article');
    if (!card) return;
    const reset = () => setDismissed(false);
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) reset();
    };
    card.addEventListener('mouseleave', reset);
    card.addEventListener('focusout', onFocusOut);
    return () => {
      card.removeEventListener('mouseleave', reset);
      card.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    setDismissed(true);
    panelRef.current?.closest('article')?.querySelector<HTMLElement>('a[href^="/producto/"]')?.focus();
  }

  return (
    <div
      ref={panelRef}
      data-testid="quick-add"
      data-dismissed={dismissed}
      onKeyDown={onKeyDown}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden translate-y-full bg-surface/95 p-4 opacity-0 backdrop-blur-sm transition duration-300 motion-reduce:translate-y-0 motion-reduce:transition-none md:block group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 data-[dismissed=true]:pointer-events-none! data-[dismissed=true]:opacity-0!"
    >
      <div role="group" aria-label={`Talla de ${productName}`} className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const soldOut = size.stock <= 0;
          const active = size.variantId === selected?.variantId;
          return (
            <button
              key={size.variantId}
              type="button"
              disabled={soldOut}
              aria-pressed={active}
              aria-label={soldOut ? `Talla ${size.size}, agotada` : `Talla ${size.size}`}
              data-testid="quick-add-size"
              onClick={() => setPickedId(size.variantId)}
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
      <div className="mt-3">
        <AddToCartButton
          variantId={selected?.variantId ?? null}
          stock={selected?.stock ?? 0}
          productName={productName}
          signedIn={signedIn}
          testId="quick-add-button"
          hideHint
          fullWidth
          label="Añadir a la cesta"
        />
      </div>
    </div>
  );
}
