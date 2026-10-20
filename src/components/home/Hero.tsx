import Link from 'next/link';

const VERTICAL = '/images/hero/hero-pareja-vertical';
const HORIZONTAL = '/images/hero/hero-pareja-horizontal';

export const HERO_ALT =
  'Una mujer con blusa blanca y pantalón gris y un hombre con camisa blanca y pantalón chino beige, de pie en un interior luminoso de paredes de hormigón';

/**
 * Hero a sangre de la portada (RF-23, CA-69 y CA-82; T-037 y T-047). Ocupa todo el ancho de la ventana, fuera del
 * contenedor de página. Una sola imagen por pantalla, con dirección de arte:
 * - En móvil, la foto vertical a `aspect-3/4`, con la pareja abajo y el texto arriba, sobre la pared lisa, con el
 *   degradado de arriba abajo.
 * - Desde `--bp-md` (md), la foto horizontal a 16:9, con la pareja a la derecha y el texto abajo a la izquierda; el
 *   degradado va de izquierda a derecha para oscurecer la pared donde está el texto y no a la pareja.
 * Los navegadores sin AVIF (p. ej. el WebKit de Playwright) caen a WebP. El texto es blanco (`accent-fg`) sobre un
 * degradado oscuro del token `fg` (no un negro del navegador) y su contraste se comprueba con píxeles en el e2e.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative isolate w-full overflow-hidden bg-fg">
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
          className="block aspect-3/4 w-full object-cover object-bottom md:aspect-video md:object-right"
        />
      </picture>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-fg/80 via-fg/55 via-40% to-transparent md:bg-linear-to-r md:from-fg/85 md:via-fg/55 md:via-50%"
      />
      <div
        data-testid="hero-text"
        className="absolute inset-x-0 top-0 p-6 text-accent-fg sm:p-8 md:bottom-0 md:top-auto md:p-12 lg:p-16"
      >
        <p className="text-sm font-semibold uppercase tracking-wide">Nueva colección</p>
        <h1 id="hero-titulo" className="mt-2 text-display font-bold">
          Estilo urbano
        </h1>
        <Link
          href="/novedades"
          className="mt-6 inline-flex min-h-12 items-center rounded-control bg-surface px-8 text-base font-semibold text-fg hover:bg-accent-soft"
        >
          Ver colección
        </Link>
      </div>
    </section>
  );
}
