import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/**
 * Franja de envío gratis de la portada (CA-117, T-072; antes un banner con foto, CA-98). Es solo texto, a todo el ancho
 * y con tokens: el mensaje ya está en la barra de anuncios y en la sección de confianza, y una foto grande lo repetía
 * una tercera vez. El umbral sale de `shop.ts`, no se escribe a mano. Reversible: la foto sigue en `public/`.
 */
export function ShippingBanner() {
  return (
    <section
      aria-label="Envío gratis"
      data-testid="shipping-banner"
      className="flex min-h-14 w-full items-center justify-center bg-surface-muted px-(--layout-gutter) py-3 text-center"
    >
      <p data-testid="shipping-banner-text" className="text-base font-semibold text-fg md:text-lg">
        Envío gratis a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}
      </p>
    </section>
  );
}
