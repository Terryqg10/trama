import type { DualBannerSlide } from './DualBannerSlider';

/**
 * Slides del banner dividido (CA-112, T-068). Cada slide son dos tarjetas (izquierda y derecha). Las rutas de imagen van
 * sin extensión: se sirve `.webp` con `next/image`. Los textos describen la foto; Trama no vende calzado, así que esa
 * tarjeta lleva a Novedades (VERIFICAR en una tienda real).
 */
export const DUAL_BANNER_SLIDES: readonly [DualBannerSlide, DualBannerSlide] = [
  {
    id: 'otono-sudaderas',
    cards: [
      {
        image: '/images/products/split-banner-1-izq',
        eyebrow: 'Nueva colección',
        title: 'Colección otoño',
        subtitle: 'Gabardinas y abrigos para los días de frío.',
        ctaLabel: 'Ver novedades',
        href: '/novedades',
      },
      {
        image: '/images/products/split-banner-1-der',
        eyebrow: 'Para él',
        title: 'Sudaderas esenciales',
        subtitle: 'Capucha, corte amplio y colores de temporada.',
        ctaLabel: 'Ver sudaderas',
        href: '/hombre?categoria=sudaderas',
      },
    ],
  },
  {
    id: 'punto-calzado',
    cards: [
      {
        image: '/images/products/split-banner-2-izq',
        eyebrow: 'Para ella',
        title: 'Punto y jerséis',
        subtitle: 'Tejidos gruesos y cálidos para estrenar.',
        ctaLabel: 'Ver jerséis',
        href: '/mujer?categoria=jerseis',
      },
      {
        image: '/images/products/split-banner-2-der',
        eyebrow: 'Nueva colección',
        title: 'Calzado urbano',
        subtitle: 'Botas negras para completar el look.',
        ctaLabel: 'Ver novedades',
        href: '/novedades',
      },
    ],
  },
];
