import Image from 'next/image';
import Link from 'next/link';

/**
 * Sección «Prepárate para el frío» de la portada (CA-116, T-071; sustituye al banner de otoño a sangre, Enmienda 31).
 * Título y cuatro tarjetas de categoría con foto, en el contenedor de la página. Las fotos son decorativas: el enlace se
 * nombra con su etiqueta. Por debajo de 768 px es un carrusel deslizable con imán, nativo (CSS, sin JavaScript) y con la
 * siguiente tarjeta asomando; desde 768 px, una rejilla de 4. Sin autoavance: el movimiento es solo el scroll del usuario.
 */
const TILES = [
  { href: '/mujer?categoria=abrigos', label: 'Abrigos', image: '/images/products/abrigo-largo-camel.webp' },
  { href: '/mujer?categoria=jerseis', label: 'Jerséis', image: '/images/products/jersey-punto-crema.webp' },
  { href: '/hombre?categoria=chaquetas', label: 'Chaquetas', image: '/images/products/chaqueta-acolchada-negra.webp' },
  { href: '/hombre?categoria=sudaderas', label: 'Sudaderas', image: '/images/products/hoodie-gris.webp' },
] as const;

export function ColdWeatherSection() {
  return (
    <section aria-labelledby="frio-titulo" data-testid="cold-section">
      <h2 id="frio-titulo" className="text-2xl font-bold text-fg">
        Prepárate para el frío
      </h2>
      {/* Carrusel táctil: el desbordamiento horizontal es deliberado (data-allow-overflow). Los márgenes negativos sacan la fila a sangre dentro del contenedor. */}
      <ul
        data-allow-overflow=""
        data-testid="cold-list"
        className="-mx-(--layout-gutter) mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-(--layout-gutter) px-(--layout-gutter) pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0"
      >
        {TILES.map((tile) => (
          <li key={tile.href} className="w-2/3 max-w-72 shrink-0 snap-start md:w-auto md:max-w-none">
            <Link
              href={tile.href}
              data-testid="cold-tile"
              className="group relative block aspect-4/5 overflow-hidden rounded-card bg-surface-muted shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Image
                src={tile.image}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 67vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-fg/90 via-fg/50 via-40% to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 p-4 text-lg font-semibold text-accent-fg">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
