import Link from 'next/link';

const VERTICAL = '/images/hero/hero-pareja-vertical';
const HORIZONTAL = '/images/hero/hero-pareja-horizontal';

export const HERO_ALT =
  'Una mujer con blusa blanca y pantalón gris y un hombre con camisa blanca y pantalón chino beige, de pie en un interior luminoso de paredes de hormigón';

/**
 * Hero de la portada (RF-23, T-037). Una sola imagen por pantalla, con dirección de arte:
 * - En móvil, la foto vertical arriba y el texto debajo, en columna.
 * - Desde `--bp-md` (md), la foto horizontal de fondo y el texto a la izquierda, sobre la pared lisa.
 * Los navegadores sin AVIF (p. ej. WebKit sin soporte) caen a WebP. El texto sobre la foto lleva un degradado
 * de `surface` (scrim) que garantiza contraste AA; lo comprueba el e2e `home-hero`.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative isolate overflow-hidden rounded-container bg-accent-soft md:flex md:aspect-video md:items-center"
    >
      <picture>
        <source media="(min-width: 768px)" srcSet={`${HORIZONTAL}.avif`} type="image/avif" />
        <source media="(min-width: 768px)" srcSet={`${HORIZONTAL}.webp`} type="image/webp" />
        <source srcSet={`${VERTICAL}.avif`} type="image/avif" />
        <source srcSet={`${VERTICAL}.webp`} type="image/webp" />
        {/* `<picture>` con dirección de arte y varios formatos: next/image no puede expresarlo. Es la imagen LCP (prioridad alta). */}
        <img
          src={`${VERTICAL}.webp`}
          alt={HERO_ALT}
          width={1116}
          height={2000}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="block aspect-4/5 w-full object-cover object-bottom md:absolute md:inset-0 md:aspect-auto md:h-full md:object-right"
        />
      </picture>
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-linear-to-r from-surface/90 from-0% via-surface/85 via-55% to-transparent to-85% md:block"
      />
      <div data-testid="hero-text" className="relative p-6 sm:p-8 md:w-1/2 md:p-12 lg:p-16">
        <h1 id="hero-titulo" className="text-display font-bold text-fg">
          Trama
        </h1>
        <p className="mt-3 max-w-(--layout-prose-max) text-fg-muted">
          Ropa casual y de vestir para hombre y mujer: polos, camisas, blusas y pantalones.
        </p>
        <Link
          href="/novedades"
          className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Ver novedades
        </Link>
      </div>
    </section>
  );
}
