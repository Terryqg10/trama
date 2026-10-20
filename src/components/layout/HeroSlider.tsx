'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';

export interface HeroSlide {
  readonly id: string;
  /** Ruta sin extensión: se ofrecen `.avif` y `.webp`. */
  readonly image: string;
  /** Foto vertical para pantallas menores de 768 px; sin ella se usa `image`. */
  readonly mobileImage?: string;
  readonly alt: string;
  readonly title: string;
  readonly subtitle: string;
  readonly ctaLabel: string;
  readonly href: string;
}

export const AUTOPLAY_MS = 5000;

const controlClass =
  'inline-flex size-11 items-center justify-center rounded-full text-accent-fg hover:bg-accent-fg/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg';

/**
 * Hero a sangre de la portada como slider (CA-86, CA-87 y CA-88; T-049). Una foto por slide, con dirección de arte en
 * la primera (vertical en móvil, horizontal desde `--bp-md`), AVIF con WebP de respaldo y un degradado oscuro del
 * token `fg` bajo el texto.
 *
 * Movimiento: avanza solo cada 5 s, salvo con `prefers-reduced-motion` (sin autoplay y con saltos directos). Se
 * detiene con el ratón encima, con el foco dentro y con el botón de pausa (WCAG 2.2.2). Las slides no visibles son
 * `inert`: no reciben foco ni las lee un lector de pantalla. El titular de la primera slide es el único `h1`.
 */
export function HeroSlider({ slides }: { readonly slides: readonly HeroSlide[] }) {
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true });
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
    };
  }, [emblaApi]);

  const playing = !reduced && !userPaused && !hovered && !focused;

  // `selected` reinicia la cuenta de 5 s tras cada cambio, también si lo hizo la persona.
  useEffect(() => {
    if (!emblaApi || !playing) return;
    const timer = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [emblaApi, playing, selected]);

  const goTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index, reduced);
    },
    [emblaApi, reduced],
  );
  const prev = () => emblaApi?.scrollPrev(reduced);
  const next = () => emblaApi?.scrollNext(reduced);

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') setHovered(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destacados de la tienda"
      data-testid="hero-slider"
      className="relative isolate w-full overflow-hidden bg-fg"
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      {/* Las slides fuera de la ventana quedan recortadas a propósito: es el carrusel. */}
      <div ref={viewportRef} data-allow-overflow="" className="overflow-hidden">
        <div
          aria-live={playing ? 'off' : 'polite'}
          className="flex touch-pan-y touch-pinch-zoom"
        >
          {slides.map((slide, index) => {
            const first = index === 0;
            const Title = first ? 'h1' : 'h2';
            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${slides.length}`}
                data-testid="hero-slide"
                inert={index !== selected}
                className="relative min-w-0 shrink-0 grow-0 basis-full"
              >
                <picture>
                  {slide.mobileImage ? (
                    <>
                      <source media="(min-width: 768px)" srcSet={`${slide.image}.avif`} type="image/avif" />
                      <source media="(min-width: 768px)" srcSet={`${slide.image}.webp`} type="image/webp" />
                      <source srcSet={`${slide.mobileImage}.avif`} type="image/avif" />
                      <source srcSet={`${slide.mobileImage}.webp`} type="image/webp" />
                    </>
                  ) : (
                    <>
                      <source srcSet={`${slide.image}.avif`} type="image/avif" />
                      <source srcSet={`${slide.image}.webp`} type="image/webp" />
                    </>
                  )}
                  {/* `<picture>` con dirección de arte y varios formatos: next/image no puede expresarlo. La primera es la imagen LCP. */}
                  <img
                    src={`${slide.mobileImage ?? slide.image}.webp`}
                    alt={slide.alt}
                    width={slide.mobileImage ? 1116 : 2000}
                    height={2000}
                    fetchPriority={first ? 'high' : 'auto'}
                    loading={first ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    className="block aspect-3/4 w-full object-cover object-center md:aspect-video"
                  />
                </picture>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-fg/85 via-fg/70 via-55% to-transparent md:bg-linear-to-r md:from-fg/85 md:via-fg/65 md:via-60%"
                />
                <div
                  data-testid="hero-text"
                  className="absolute inset-x-0 bottom-14 p-6 text-accent-fg sm:p-8 md:bottom-16 md:max-w-3xl md:p-12 lg:bottom-20 lg:p-16"
                >
                  <Title className="mt-2 text-display font-bold">{slide.title}</Title>
                  <p className="mt-2 text-lg font-semibold">{slide.subtitle}</p>
                  <Link
                    href={slide.href}
                    className="mt-6 inline-flex min-h-12 items-center rounded-control bg-surface px-8 text-base font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
                  >
                    {slide.ctaLabel}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        data-testid="hero-controls"
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-fg/70 px-1 md:left-12 md:translate-x-0 lg:left-16"
      >
        <button type="button" aria-label="Slide anterior" onClick={prev} className={controlClass}>
          <ChevronLeft aria-hidden="true" className="size-6" />
        </button>
        <ul className="flex items-center">
          {slides.map((slide, index) => (
            <li key={slide.id}>
              <button
                type="button"
                aria-label={`Ir a la slide ${index + 1}: ${slide.title}`}
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => goTo(index)}
                className={controlClass}
              >
                <span
                  aria-hidden="true"
                  className={`block h-3 rounded-full bg-accent-fg ${index === selected ? 'w-6' : 'w-3 opacity-60'}`}
                />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" aria-label="Slide siguiente" onClick={next} className={controlClass}>
          <ChevronRight aria-hidden="true" className="size-6" />
        </button>
        {reduced ? null : (
          <button
            type="button"
            aria-label={userPaused ? 'Reanudar el cambio automático' : 'Pausar el cambio automático'}
            onClick={() => setUserPaused((value) => !value)}
            className={controlClass}
          >
            {/* Los dos iconos siempre en el DOM: si el nodo bajo el puntero se elimina, algunos navegadores no avisan de que el puntero salió y el slider se quedaría en pausa. */}
            <Play aria-hidden="true" className={userPaused ? 'size-5' : 'hidden'} />
            <Pause aria-hidden="true" className={userPaused ? 'hidden' : 'size-5'} />
          </button>
        )}
      </div>
    </section>
  );
}
