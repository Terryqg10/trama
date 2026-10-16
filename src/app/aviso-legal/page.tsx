import type { Metadata } from 'next';
import { LegalHeading, LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Aviso legal' };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal">
      <LegalHeading>Titular del sitio</LegalHeading>
      <p>
        Trama es un proyecto personal de portfolio. No hay un titular mercantil ni se facilitan
        datos de identificación, porque no existe una actividad comercial real.
      </p>

      <LegalHeading>Finalidad</LegalHeading>
      <p>
        El sitio muestra una tienda de ropa casual y de vestir con fines de demostración. Los
        productos, precios y pedidos son de ejemplo y no se realiza ninguna venta ni envío.
      </p>

      <LegalHeading>Propiedad intelectual</LegalHeading>
      <p>
        El diseño y el código del sitio forman parte de un proyecto de portfolio. Las marcas y
        productos que pudieran aparecer son de ejemplo.
      </p>

      <LegalHeading>Qué debería incluir un aviso legal real</LegalHeading>
      <p>
        Un sitio comercial real debe identificar a su titular y ofrecer un canal de contacto,
        conforme a la normativa española de servicios de la sociedad de la información. VERIFICAR
        los requisitos exactos con un asesor antes de cualquier uso real.
      </p>
    </LegalPage>
  );
}
