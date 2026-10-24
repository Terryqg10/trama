import Image from 'next/image';

/**
 * Banner de la página de Ofertas (RF-12, CA-04, T-100). Foto existente de la colección de otoño (`banner-otono.webp`,
 * decorativa: `alt` vacío) con un velo oscuro de tokens para que el texto cumpla el contraste AA. El porcentaje sale de
 * las rebajas reales (`maxOfferPercent`); sin cifra el mensaje no promete ninguna.
 */
export function OffersBanner({ maxPercent }: { readonly maxPercent: number | null }) {
  return (
    <section
      aria-labelledby="ofertas-banner-titulo"
      data-testid="offers-banner"
      className="relative isolate flex min-h-56 items-center justify-center overflow-clip rounded-container px-6 py-10 text-center text-surface md:min-h-72 md:px-12"
    >
      <Image
        src="/images/products/banner-otono.webp"
        alt=""
        fill
        unoptimized
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="-z-10 object-cover object-[50%_30%]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-fg/60" />
      <div>
        <h2 id="ofertas-banner-titulo" className="text-2xl font-bold md:text-4xl">
          {maxPercent === null ? 'Ofertas' : `Hasta -${maxPercent}% en prendas seleccionadas`}
        </h2>
        <p className="mx-auto mt-2 max-w-(--layout-prose-max) text-base md:text-lg">
          {maxPercent === null
            ? 'Ahora mismo no hay prendas rebajadas.'
            : 'Precios rebajados en abrigos, jerséis y más. Hasta fin de existencias.'}
        </p>
      </div>
    </section>
  );
}
