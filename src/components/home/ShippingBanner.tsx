import Image from 'next/image';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/**
 * Banner de envío gratis de la portada (CA-98, T-057; antes una franja gris, CA-84). La foto es decorativa
 * (`alt=""`): el mensaje lo dice todo. El umbral sale de `shop.ts`, no se escribe a mano. El texto va centrado sobre
 * `fg` al 70 % (token): la foto es clara y su contraste se comprueba con píxeles en el e2e. Altura de 224 px en móvil
 * y 320 px desde `md` (no `vh` arbitrarios: `rules/styles.md`).
 */
export function ShippingBanner() {
  return (
    <section
      aria-label="Envío gratis"
      data-testid="shipping-banner"
      className="relative isolate flex h-56 w-full items-center justify-center overflow-hidden bg-fg px-4 text-center md:h-80"
    >
      <Image
        src="/images/products/banner-envio-gratis.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-fg/70" />
      <p data-testid="shipping-banner-text" className="relative text-2xl font-bold text-accent-fg md:text-4xl">
        Envío gratis a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}
      </p>
    </section>
  );
}
