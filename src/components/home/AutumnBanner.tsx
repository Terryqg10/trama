import Image from 'next/image';
import Link from 'next/link';

/**
 * Banner de otoño de la portada, bajo Explora (CA-95, T-054). La foto es decorativa (`alt=""`): el mensaje y el
 * botón lo dicen todo. El texto va sobre un degradado oscuro del token `fg` (de abajo arriba en móvil y de izquierda
 * a derecha desde `md`, donde está la pareja a la derecha) y su contraste se comprueba con píxeles en el e2e.
 */
export function AutumnBanner() {
  return (
    <section
      aria-labelledby="otono-titulo"
      data-testid="autumn-banner"
      className="relative isolate overflow-hidden rounded-card bg-fg"
    >
      <div className="relative aspect-4/5 sm:aspect-video md:aspect-21/9">
        <Image
          src="/images/products/banner-otono.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-fg/90 via-fg/60 via-50% to-transparent md:bg-linear-to-r md:from-fg/90 md:via-fg/70 md:via-55%"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 text-accent-fg sm:p-8 md:inset-y-0 md:flex md:max-w-md md:flex-col md:justify-center md:p-12">
          <h2 id="otono-titulo" data-testid="autumn-text" className="text-3xl font-bold md:text-4xl">
            Prepárate para el frío
          </h2>
          <Link
            href="/hombre"
            className="mt-6 inline-flex min-h-12 w-fit items-center rounded-control bg-surface px-8 text-base font-semibold text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
          >
            Ver abrigos
          </Link>
        </div>
      </div>
    </section>
  );
}
