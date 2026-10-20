import Image from 'next/image';
import Link from 'next/link';

/** Accesos visuales a las categorías principales (CA-83, T-048). La imagen es decorativa: el enlace se nombra con su etiqueta. */
const TILES = [
  { href: '/mujer', label: 'Mujer', image: '/images/products/chaqueta-vaquera-oversize.webp' },
  { href: '/hombre', label: 'Hombre', image: '/images/products/bomber-negra.webp' },
  { href: '/novedades', label: 'Novedades', image: '/images/products/blusa-lino-crema.webp' },
  { href: '/ofertas', label: 'Ofertas', image: '/images/products/sudadera-cropped-rosa.webp' },
] as const;

export function ExploreSection() {
  return (
    <section aria-labelledby="explora-titulo">
      <h2 id="explora-titulo" className="text-2xl font-bold text-fg">
        Explora
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {TILES.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              data-testid="explore-tile"
              className="group relative block aspect-4/5 overflow-hidden rounded-card bg-surface-muted shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Image
                src={tile.image}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-fg/70 via-transparent to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 p-4 text-lg font-semibold text-accent-fg">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
