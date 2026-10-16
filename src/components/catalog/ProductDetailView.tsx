import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ProductDetail } from '@/lib/catalog/product';
import { resolveSelection } from '@/lib/catalog/variant-selection';
import type { RawSearchParams } from '@/lib/catalog/filters';
import { capitalize } from '@/lib/catalog/facets';
import type { SizeGuide } from '@/lib/catalog/size-guide';
import { formatEuros } from '@/lib/domain/shop';
import { PageContainer } from '../PageContainer';
import { ShippingInfo } from '../ShippingInfo';
import { FitInfo } from './FitInfo';
import { SizeGuideModal } from './SizeGuideModal';
import { SizeGuideTable } from './SizeGuideTable';
import { VariantSelector } from './VariantSelector';

/**
 * Ficha de producto (RF-02): en móvil, imagen arriba y datos debajo; en escritorio, dos columnas
 * (estilo v1-soft-commerce). Componente de servidor: la selección de color y talla viene de la URL.
 * La guía de tallas (T-027) se abre en un panel si la categoría tiene guía, y los datos de ajuste
 * (T-028) se muestran si el producto los tiene. El botón «Añadir al carrito» llega con T-018.
 */
export function ProductDetailView({
  product,
  sizeGuide,
  searchParams,
}: {
  readonly product: ProductDetail;
  /** Guía de la categoría del producto, o `null` si no tiene (entonces no se muestra el enlace). */
  readonly sizeGuide: SizeGuide | null;
  readonly searchParams: RawSearchParams;
}) {
  const selection = resolveSelection(product, searchParams);
  const prices = new Set(product.variants.map((variant) => variant.priceCents));
  const priceLabel = selection.variant
    ? formatEuros(selection.variant.priceCents)
    : prices.size > 1
      ? `Desde ${formatEuros(product.fromPriceCents)}`
      : formatEuros(product.fromPriceCents);
  const backHref = product.gender === 'hombre' ? '/hombre' : '/mujer';

  return (
    <PageContainer>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1 rounded-control pr-3 text-sm font-medium text-accent-text hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a {product.gender === 'hombre' ? 'Hombre' : 'Mujer'}
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2 md:items-start">
        <div className="relative aspect-4/5 overflow-hidden rounded-container border border-border bg-surface-muted">
          {selection.image ? (
            <Image
              src={selection.image.path}
              alt={selection.image.alt}
              width={800}
              height={1000}
              unoptimized
              // Es la imagen LCP de la página: carga con prioridad (patrón de T-015).
              preload
              fetchPriority="high"
              loading="eager"
              className="h-full w-full object-contain p-8"
            />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-fg-muted">Sin imagen</p>
          )}
          {product.isNew ? (
            <span className="absolute left-4 top-4 rounded-control bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
              Nuevo
            </span>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-display font-bold">{product.name}</h1>
            <p className="mt-3 text-2xl font-bold text-fg">{priceLabel}</p>
            <p className="text-sm text-fg-muted">IVA incluido</p>
          </div>

          {product.description ? (
            <p className="max-w-(--layout-prose-max) text-fg">{product.description}</p>
          ) : null}

          <VariantSelector slug={product.slug} selection={selection} />

          {sizeGuide ? (
            <SizeGuideModal title={`Guía de tallas: ${capitalize(product.category)}`}>
              <SizeGuideTable category={product.category} guide={sizeGuide} />
            </SizeGuideModal>
          ) : null}

          <FitInfo product={product} />
        </div>
      </div>

      <div className="mt-12">
        <ShippingInfo />
      </div>
    </PageContainer>
  );
}
