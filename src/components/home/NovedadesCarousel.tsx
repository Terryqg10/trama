'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { CatalogProduct } from '@/lib/catalog/product';
import { ProductCard } from '../catalog/ProductCard';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

/**
 * Flechas del carrusel (CA-146): solo desde `--bp-md` (en móvil se desliza con el dedo), con fundido al pasar el ratón
 * por la sección o al recibir foco el teclado. Siguen en el DOM, así que se alcanzan con Tab.
 */
const arrowClass =
  'hidden size-11 items-center justify-center rounded-full border border-border-strong bg-surface text-fg opacity-0 transition-opacity duration-200 hover:bg-accent-soft focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent group-focus-within/novedades:opacity-100 group-hover/novedades:opacity-100 disabled:cursor-not-allowed group-focus-within/novedades:disabled:opacity-40 group-hover/novedades:disabled:opacity-40 md:inline-flex motion-reduce:transition-none';

/**
 * Novedades de la portada como carrusel con efecto «peek» (CA-146, T-113): 4 tarjetas desde `--bp-lg`, 2,5 desde
 * `--bp-md` y 1,2 en móvil, para que se asome la siguiente. Embla no admite `gap`, así que la separación de `gap-6` se
 * hace con `-ml-6` en el contenedor y `pl-6` en cada slide.
 */
export function NovedadesCarousel({ products }: { readonly products: readonly CatalogProduct[] }) {
  const [viewportRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
  const reduced = usePrefersReducedMotion();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on('select', update).on('reInit', update).on('resize', update);
    return () => {
      emblaApi.off('select', update).off('reInit', update).off('resize', update);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(reduced), [emblaApi, reduced]);
  const next = useCallback(() => emblaApi?.scrollNext(reduced), [emblaApi, reduced]);

  return (
    <section
      aria-labelledby="novedades-titulo"
      aria-roledescription="carousel"
      data-testid="new-arrivals"
      className="group/novedades"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 id="novedades-titulo" className="text-2xl font-bold text-fg">
          Novedades
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Novedades anteriores"
            data-testid="novedades-prev"
            disabled={!canPrev}
            onClick={prev}
            className={arrowClass}
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Novedades siguientes"
            data-testid="novedades-next"
            disabled={!canNext}
            onClick={next}
            className={arrowClass}
          >
            <ChevronRight aria-hidden="true" className="size-6" />
          </button>
          <Link
            href="/novedades"
            className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-accent-text hover:underline"
          >
            Ver todo
          </Link>
        </div>
      </div>
      {/* Las tarjetas fuera de la ventana quedan recortadas a propósito: es el carrusel. El padding da sitio a la sombra. */}
      <div ref={viewportRef} data-allow-overflow="" data-testid="novedades-viewport" className="-mb-2 mt-4 overflow-hidden pb-2">
        <ul className="-ml-6 flex touch-pan-y touch-pinch-zoom">
          {products.map((product) => (
            <li key={product.id} data-testid="novedades-slide" className="min-w-0 shrink-0 grow-0 basis-5/6 pl-6 md:basis-2/5 lg:basis-1/4">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
