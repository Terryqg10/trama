import type { HeroSlide } from '@/components/layout/HeroSlider';

/** Slides de la portada (CA-86). Las rutas van sin extensión: el slider ofrece AVIF y WebP. */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: 'coleccion',
    image: '/images/hero/hero-coleccion',
    mobileImage: '/images/hero/hero-coleccion-movil',
    alt: 'Un hombre con chaqueta gris oscuro y pantalón cargo negro y una mujer con plumífero verde y pantalón cargo caminan juntos sobre un fondo gris claro',
    title: 'Nueva colección',
    subtitle: 'Prendas urbanas para estrenar esta temporada',
    ctaLabel: 'Ver colección',
    href: '/novedades',
  },
  {
    id: 'urbano',
    image: '/images/products/cat-urbano',
    alt: 'Un chico con una camiseta negra desgastada con un estampado de cómic',
    title: 'Estilo urbano',
    subtitle: 'Básicos con carácter para él',
    ctaLabel: 'Ver hombre',
    href: '/hombre',
  },
  {
    id: 'kawaii',
    image: '/images/products/cat-kawaii',
    alt: 'Una chica con una camiseta rosa con un conejito kawaii estampado',
    title: 'Kawaii style',
    subtitle: 'Ternura y color en cada prenda',
    ctaLabel: 'Ver mujer',
    href: '/mujer',
  },
];
