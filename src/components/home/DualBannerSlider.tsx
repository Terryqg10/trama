'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { Pause, Play } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore, type FocusEvent, type PointerEvent } from 'react';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';

export interface DualBannerCard {
  /** Ruta sin extensión: se sirve `.webp` con `next/image`. */
  readonly image: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly ctaLabel: string;
  readonly href: string;
}

export interface DualBannerSlide {
  readonly id: string;
  readonly cards: readonly [DualBannerCard, DualBannerCard];
}

/** Tiempo que se ve cada slide antes del fundido al siguiente (CA-113). */
export const DUAL_BANNER_MS = 5000;

const noSubscription = (): (() => void) => () => undefined;

const controlClass =
  'inline-flex size-11 items-center justify-center rounded-full text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function Card({ card }: { readonly card: DualBannerCard }) {
  return (
    <div className="relative isolate aspect-4/5 overflow-hidden rounded-card bg-fg sm:aspect-4/3 md:aspect-4/5 lg:aspect-4/3" data-testid="dual-banner-card">
      <Image src={`${card.image}.webp`} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-fg/90 via-fg/80 via-55% to-fg/45" />
      <div data-testid="dual-banner-text" className="absolute inset-x-0 bottom-0 p-6 text-accent-fg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide">{card.eyebrow}</p>
        <h3 className="mt-1 text-3xl font-bold md:text-4xl">{card.title}</h3>
        <p className="mt-2 text-base">{card.subtitle}</p>
        <Link
          href={card.href as Route}
          className="mt-4 inline-flex min-h-12 items-center rounded-full bg-surface px-6 text-base font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
        >
          {card.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

/**
 * Banner dividido de la portada (CA-112 y CA-113, T-068): dos tarjetas lado a lado (apiladas en móvil) que pasan a las
 * dos siguientes cada 5 s con un fundido cruzado. Las capas conviven en la misma celda de una rejilla (la altura es la
 * de la más alta, sin saltos) y solo se anima `opacity` (`transition-opacity`, sin transición con
 * `prefers-reduced-motion`, que además desactiva el cambio automático). Se detiene con el ratón encima, con el foco
 * dentro y con el botón de pausa (WCAG 2.2.2); los puntos eligen el slide. El slide que no se ve es `inert`: no recibe
 * foco ni lo leen los lectores de pantalla.
 */
export function DualBannerSlider({ slides }: { readonly slides: readonly DualBannerSlide[] }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // `true` cuando React ya controla los botones (las pruebas esperan a que lo estén antes de pulsar).
  const ready = useSyncExternalStore(noSubscription, () => true, () => false);

  const playing = !reduced && !paused && !hovered && !focused && slides.length > 1;

  // `active` reinicia la cuenta de 5 s tras cada cambio, también si lo hizo la persona.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), DUAL_BANNER_MS);
    return () => window.clearInterval(timer);
  }, [playing, active, slides.length]);

  const onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') setHovered(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="dual-banner-titulo"
      data-testid="dual-banner"
      data-active={active}
      data-playing={playing}
      data-ready={ready}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <h2 id="dual-banner-titulo" className="sr-only">
        Destacados de temporada
      </h2>
      <div aria-live={playing ? 'off' : 'polite'} className="grid">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${slides.length}`}
            data-testid="dual-banner-slide"
            data-active={index === active}
            inert={index !== active}
            className={`col-start-1 row-start-1 grid gap-4 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none md:grid-cols-2 ${
              index === active ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {slide.cards.map((card) => (
              <Card key={card.title} card={card} />
            ))}
          </div>
        ))}
      </div>

      <div data-testid="dual-banner-controls" className="mt-3 flex items-center justify-center">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ir al slide ${index + 1}`}
            aria-current={index === active ? 'true' : undefined}
            onClick={() => setActive(index)}
            className={controlClass}
          >
            <span aria-hidden="true" className={`block h-3 rounded-full bg-accent ${index === active ? 'w-6' : 'w-3 opacity-40'}`} />
          </button>
        ))}
        {reduced ? null : (
          <button
            type="button"
            aria-label={paused ? 'Reanudar el cambio automático del banner' : 'Pausar el cambio automático del banner'}
            onClick={() => setPaused((value) => !value)}
            className={controlClass}
          >
            {/* Los dos iconos siempre en el DOM: si el nodo bajo el puntero desaparece, algunos navegadores no avisan de la salida. */}
            <Play aria-hidden="true" className={paused ? 'size-5' : 'hidden'} />
            <Pause aria-hidden="true" className={paused ? 'hidden' : 'size-5'} />
          </button>
        )}
      </div>
    </section>
  );
}
