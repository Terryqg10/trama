import { FREE_SHIPPING_THRESHOLD_CENTS, RETURN_WINDOW_DAYS, formatEuros } from '@/lib/domain/shop';

/**
 * Barra de anuncios sobre la cabecera de la tienda (CA-81, T-046). Los importes y plazos salen de las
 * constantes de `shop.ts` (RF-16 y RF-22): nunca se escriben a mano, para que coincidan con el resto de la tienda.
 * En móvil los dos mensajes se apilan (no caben en una línea a 375 px); desde `sm` van en una sola con un separador.
 */
export function TopBar() {
  return (
    <div data-testid="top-bar" className="bg-accent px-4 py-2 text-center text-xs font-medium text-accent-fg sm:text-sm">
      <p className="flex flex-col items-center gap-0.5 sm:flex-row sm:justify-center sm:gap-3">
        <span>Envío gratis a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}</span>
        <span aria-hidden="true" className="hidden sm:inline">
          |
        </span>
        <span>Devoluciones gratuitas en {RETURN_WINDOW_DAYS} días</span>
      </p>
    </div>
  );
}
