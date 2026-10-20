import Image from 'next/image';
import Link from 'next/link';

/**
 * Banner de otoño de la portada, a sangre y bajo el banner dividido (CA-95 y CA-115, T-054 y T-070). La foto es
 * decorativa (`alt=""`): el mensaje y el botón lo dicen todo. El texto va en un contenedor con el ancho de la página,
 * alineado con el resto de secciones aunque la foto ocupe toda la ventana (`band-inset-start`). Va sobre un degradado
 * oscuro del token `fg` (de abajo arriba en móvil y de izquierda a derecha desde `md`, donde está la pareja a la
 * derecha) y su contraste se comprueba con píxeles en el e2e.
 */
export function AutumnBanner() {
  return (
    <section
      aria-labelledby="otono-titulo"
      data-testid="autumn-banner"
      className="band relative isolate h-96 w-full overflow-hidden bg-fg lg:h-112"
    >
      <Image
        src="/images/products/banner-otono.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-fg/90 via-fg/60 via-50% to-transparent md:bg-linear-to-r md:from-fg/90 md:via-fg/70 md:via-55%"
      />
      <div className="band-inset-start absolute inset-0 pe-(--layout-gutter) text-accent-fg">
        <div className="flex h-full flex-col justify-end pb-8 md:max-w-md md:justify-center md:pb-0">
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
