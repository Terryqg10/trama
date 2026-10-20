import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';

/**
 * Barra de anuncios sobre la cabecera de la tienda (CA-94, T-053; antes CA-81). El umbral de envío gratis sale
 * de la constante de `shop.ts` (RF-22): nunca se escribe a mano, para que coincida con el carrito.
 * En móvil los dos mensajes se apilan (no caben en una línea a 375 px); desde `sm` van en una sola con un separador.
 */
export function TopBar() {
  return (
    <div data-testid="top-bar" className="bg-accent px-4 py-2 text-center text-xs font-medium text-accent-fg sm:text-sm">
      <p className="flex flex-col items-center gap-0.5 sm:flex-row sm:justify-center sm:gap-3">
        <span>Nueva colección Otoño/Invierno ya disponible</span>
        <span aria-hidden="true" className="hidden sm:inline">
          |
        </span>
        <span>Envío gratis a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}</span>
      </p>
    </div>
  );
}
