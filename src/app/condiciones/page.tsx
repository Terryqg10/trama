import type { Metadata } from 'next';
import { LegalHeading, LegalPage } from '@/components/LegalPage';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  RETURN_WINDOW_DAYS,
  SHIPPING_FLAT_CENTS,
  formatEuros,
} from '@/lib/domain/shop';

export const metadata: Metadata = { title: 'Condiciones de compra' };

export default function CondicionesPage() {
  return (
    <LegalPage title="Condiciones de compra">
      <LegalHeading>Naturaleza del sitio</LegalHeading>
      <p>
        Trama es una tienda de demostración. No se realizan ventas reales ni envíos de ningún
        pedido.
      </p>

      <LegalHeading>Pagos</LegalHeading>
      <p>
        Los pagos funcionan en modo de prueba con tarjetas de prueba. No se cobra ningún importe
        real. No introduzcas datos de una tarjeta real.
      </p>

      <LegalHeading>Precios</LegalHeading>
      <p>Los precios se muestran en euros, con el IVA incluido.</p>

      <LegalHeading>Envío</LegalHeading>
      <p>
        El envío a domicilio cuesta {formatEuros(SHIPPING_FLAT_CENTS)} de tarifa plana y es gratis
        a partir de {formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}.
      </p>

      <LegalHeading>Devoluciones</LegalHeading>
      <p>
        Se muestra un plazo de {RETURN_WINDOW_DAYS} días como política de ejemplo. La aplicación no
        gestiona devoluciones reales. VERIFICAR los plazos legales de desistimiento antes de
        cualquier uso real.
      </p>
    </LegalPage>
  );
}
