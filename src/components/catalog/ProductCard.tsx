import Image from 'next/image';
import { formatEuros } from '@/lib/domain/shop';
import type { CatalogProduct } from '@/lib/catalog/product';

/**
 * Tarjeta de producto del listado. Sin enlace ni botón de compra por ahora: la
 * ficha llega con T-005b. Las insignias son texto, no solo color (WCAG AA).
 */
export function ProductCard({ product }: { readonly product: CatalogProduct }) {
  const image = product.images[0];
  const prices = new Set(product.variants.map((variant) => variant.priceCents));
  const priceLabel =
    prices.size > 1
      ? `Desde ${formatEuros(product.fromPriceCents)}`
      : formatEuros(product.fromPriceCents);
  const colorCount = product.colors.length;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="relative aspect-4/5 bg-surface-muted">
        {image ? (
          <Image
            src={image.path}
            alt={image.alt}
            width={400}
            height={500}
            unoptimized
            className="h-full w-full object-contain p-6"
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
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="text-base font-semibold text-fg">{product.name}</h2>
        <p className="text-sm text-fg-muted">
          {colorCount} {colorCount === 1 ? 'color' : 'colores'}
        </p>
        <p className="mt-auto pt-2 text-base font-bold text-fg">{priceLabel}</p>
      </div>
    </article>
  );
}
