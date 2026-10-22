import Image from 'next/image';
import { isPhotoPath } from '@/lib/catalog/image-path';
import Link from 'next/link';
import { cardDiscount } from '@/lib/catalog/discount';
import { formatEuros } from '@/lib/domain/shop';
import type { CatalogProduct } from '@/lib/catalog/product';

/**
 * Tarjeta de producto del listado. Enlaza a su ficha (T-005b). Las insignias son texto, no solo color (WCAG AA). Con
 * rebaja (`compare_at_cents`, T-075) lleva la insignia «-N%» y el precio anterior tachado junto al actual (CA-119, T-076).
 */
export function ProductCard({
  product,
  priority = false,
}: {
  readonly product: CatalogProduct;
  /** Solo la imagen que será LCP (la primera del listado): carga con prioridad, sin `lazy`. */
  readonly priority?: boolean;
}) {
  const image = product.images[0];
  const prices = new Set(product.variants.map((variant) => variant.priceCents));
  const priceLabel =
    prices.size > 1
      ? `Desde ${formatEuros(product.fromPriceCents)}`
      : formatEuros(product.fromPriceCents);
  const colorCount = product.colors.length;
  const discount = cardDiscount(product);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
      <div className="relative aspect-3/4 overflow-hidden bg-surface-muted">
        {image ? (
          <Image
            src={image.path}
            alt={image.alt}
            width={400}
            height={500}
            unoptimized
            // `priority` de Next está obsoleto desde la 16 y solo quita el `lazy`: la carga con prioridad
            // es `preload` y `fetchPriority="high"` (T-015).
            preload={priority}
            fetchPriority={priority ? 'high' : undefined}
            loading={priority ? 'eager' : undefined}
            className={
              isPhotoPath(image.path)
                ? 'h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105'
                : 'h-full w-full object-contain p-6 transition-transform duration-500 motion-safe:group-hover:scale-105'
            }
          />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-fg-muted">Sin imagen</p>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.isNew ? (
            <span className="rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
              Nuevo
            </span>
          ) : null}
          {!product.inStock ? (
            <span className="rounded-control border border-border-strong bg-surface px-3 py-1 text-xs font-semibold text-fg-muted">
              Agotado
            </span>
          ) : null}
          {discount ? (
            <span
              data-testid="discount-badge"
              className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg"
            >
              <span className="sr-only">Descuento </span>-{discount.percent}%
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="text-base font-semibold text-fg">
          {/* Enlace extendido: toda la tarjeta es clicable, pero hay un único enlace con nombre. */}
          <Link
            href={`/producto/${product.slug}`}
            className="after:absolute after:inset-0 hover:underline focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h2>
        <p className="text-sm text-fg-muted">
          {colorCount} {colorCount === 1 ? 'color' : 'colores'}
        </p>
        {discount ? (
          <p data-testid="card-price" className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
            <span className="sr-only">Ahora </span>
            <span className="text-base font-bold text-fg">{priceLabel}</span>
            <span className="sr-only">, antes </span>
            <del data-testid="card-price-before" className="text-sm text-fg-muted line-through">
              {formatEuros(discount.compareAtCents)}
            </del>
          </p>
        ) : (
          <p data-testid="card-price" className="mt-auto pt-2 text-base font-bold text-fg">
            {priceLabel}
          </p>
        )}
      </div>
    </article>
  );
}
