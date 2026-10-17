import type { Metadata } from 'next';
import { LegalHeading, LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Política de cookies' };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <LegalHeading>Qué cookies usamos</LegalHeading>
      <p>
        Solo cookies técnicas necesarias para el funcionamiento del sitio, como mantener la sesión
        de tu cuenta. No usamos cookies de analítica, de publicidad ni de
        seguimiento.
      </p>
      <p>
        El carrito se guarda en el almacenamiento local de tu navegador (solo las prendas elegidas y
        sus cantidades, sin datos personales) para que no se pierda al recargar. Es un
        almacenamiento técnico y no se envía a ningún tercero.
      </p>

      <LegalHeading>Cookies de terceros</LegalHeading>
      <p>
        El formulario de pago de Stripe podría establecer sus propias cookies cuando se active. En
        ese caso se informará aquí. VERIFICAR su comportamiento exacto antes de cualquier uso real.
      </p>

      <LegalHeading>Consentimiento</LegalHeading>
      <p>
        Como solo se prevén cookies técnicas, no se muestra un banner de consentimiento. Si se
        añadiera analítica o publicidad, habría que pedir consentimiento previo. VERIFICAR los
        requisitos con un asesor.
      </p>
    </LegalPage>
  );
}
