'use client';

import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCompleteLookAction } from '@/lib/cart/actions';
import type { CompleteLookItem } from '@/lib/cart/complete-look';
import { isPhotoPath } from '@/lib/catalog/image-path';
import { formatEuros } from '@/lib/domain/shop';

const sizeButton =
  'inline-flex size-11 items-center justify-center rounded-control border border-border-strong bg-surface text-sm font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-fg-muted disabled:line-through disabled:opacity-40';

/**
 * «Completa tu look» (CA-153, T-121, Enmienda 49): carrusel horizontal de hasta 3 básicos que no están en el carrito, al final del
 * cuerpo del carrito lateral. «+» despliega las tallas del producto y al elegir una se añade (si solo queda una con stock, se
 * añade directamente). Al cambiar el carrito se vuelve a pedir la lista, así que el producto añadido sale y entra otro. Si no hay
 * productos o la consulta falla, no se muestra nada.
 */
export function CompleteLook({
  cartSlugs,
  onAdd,
  onNavigate,
}: {
  readonly cartSlugs: readonly string[];
  readonly onAdd: (variantId: string, stock: number, productName: string) => void;
  readonly onNavigate: () => void;
}) {
  const slugsKey = [...new Set(cartSlugs)].sort().join(',');
  const [items, setItems] = useState<readonly CompleteLookItem[]>([]);
  const [choosing, setChoosing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCompleteLookAction(slugsKey === '' ? [] : slugsKey.split(','))
      .then((result) => {
        if (!cancelled) setItems(result.status === 'ok' ? result.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slugsKey]);

  // Mientras llega la lista nueva, el producto que acaba de entrar al carrito ya no se enseña.
  const visible = items.filter((item) => !cartSlugs.includes(item.slug));
  if (visible.length === 0) return null;

  function add(item: CompleteLookItem, size: CompleteLookItem['sizes'][number]): void {
    onAdd(size.variantId, size.stock, item.name);
    setChoosing(null);
  }

  function onPlus(item: CompleteLookItem): void {
    const available = item.sizes.filter((size) => size.stock > 0);
    const only = available.length === 1 ? available[0] : undefined;
    if (only) add(item, only);
    else setChoosing(choosing === item.id ? null : item.id);
  }

  return (
    <section aria-labelledby="completa-look-titulo" data-testid="complete-look" className="border-t border-border py-5">
      <h3 id="completa-look-titulo" className="text-base font-semibold text-fg">
        Completa tu look
      </h3>
      {/* El carrusel se desplaza con el dedo, la rueda o el teclado (el contenedor recibe foco): recorta a propósito. */}
      <ul
        tabIndex={0}
        aria-label="Productos sugeridos"
        data-allow-overflow=""
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {visible.map((item) => (
          <li key={item.id} data-testid="complete-look-item" className="w-2/5 min-w-32 shrink-0 snap-start">
            <Link href={`/producto/${item.slug}`} onClick={onNavigate} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span className="relative block aspect-3/4 overflow-hidden rounded-control border border-border bg-surface-muted">
                {item.image ? (
                  <Image
                    src={item.image.path}
                    alt={item.image.alt}
                    width={240}
                    height={320}
                    unoptimized
                    className={isPhotoPath(item.image.path) ? 'h-full w-full object-cover object-top' : 'h-full w-full object-contain p-2'}
                  />
                ) : null}
              </span>
              <span className="mt-2 line-clamp-2 block text-sm font-semibold text-fg">{item.name}</span>
            </Link>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm text-fg-muted">
                <span className="sr-only">Desde </span>
                {formatEuros(item.fromPriceCents)}
              </p>
              <button
                type="button"
                aria-label={`Añadir ${item.name} a la cesta`}
                aria-expanded={choosing === item.id}
                data-testid="complete-look-plus"
                onClick={() => onPlus(item)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Plus aria-hidden="true" className="size-5" />
              </button>
            </div>
            {choosing === item.id ? (
              <div role="group" aria-label={`Talla de ${item.name}`} data-testid="complete-look-sizes" className="mt-2 flex flex-wrap gap-2">
                {item.sizes.map((size) => (
                  <button
                    key={size.variantId}
                    type="button"
                    disabled={size.stock === 0}
                    aria-label={`Talla ${size.size}${size.stock === 0 ? ', agotada' : ''}`}
                    data-testid="complete-look-size"
                    onClick={() => add(item, size)}
                    className={sizeButton}
                  >
                    {size.size}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
