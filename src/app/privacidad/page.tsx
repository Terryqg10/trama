import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalHeading, LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <LegalHeading>Estado actual</LegalHeading>
      <p>
        Las cuentas de usuario ya están activas: al registrarte guardamos tu email, tu contraseña
        (cifrada), tu nombre y las direcciones que añadas. Los pedidos y los pagos todavía no
        están activos; esta página describe también el tratamiento previsto para cuando lo
        estén.
      </p>

      <LegalHeading>Datos previstos y para qué</LegalHeading>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Email y contraseña:</strong> crear la cuenta e iniciar sesión. La contraseña se
          guarda cifrada por el proveedor de autenticación.
        </li>
        <li>
          <strong>Nombre:</strong> mostrarlo en el perfil y en los pedidos.
        </li>
        <li>
          <strong>Direcciones de envío:</strong> entregar los pedidos.
        </li>
        <li>
          <strong>Pedidos (líneas, importes y estado):</strong> consultar el historial de compras.
        </li>
        <li>
          <strong>Datos de tarjeta:</strong> los gestiona únicamente Stripe, en modo de prueba. Este
          sitio nunca los ve ni los guarda.
        </li>
      </ul>

      <LegalHeading>Correo de novedades y ofertas</LegalHeading>
      <p>
        Si te suscribes en la portada, guardamos tu email, la constancia de que aceptaste esta política y las fechas
        de alta y de confirmación. Solo se usan para avisarte de novedades y ofertas, y solo si lo has consentido de
        forma expresa: la alta no cuenta hasta que confirmas desde el enlace de confirmación (doble confirmación).
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Cuánto tiempo:</strong> mientras no retires tu consentimiento. VERIFICAR el plazo máximo de
          conservación en un uso real.
        </li>
        <li>
          <strong>Cómo darte de baja:</strong> un servicio real incluiría un enlace de baja en cada mensaje y un
          contacto del responsable. Esta tienda es una demostración y no envía correos, así que no hay ninguno que
          enseñar. VERIFICAR el canal de baja y la base jurídica con un asesor antes de enviar nada.
        </li>
        <li>
          <strong>Con quién:</strong> no se comparte con terceros; el alojamiento está en Supabase.
        </li>
      </ul>
      <p>Este apartado es un texto de ejemplo, no asesoramiento legal.</p>

      <LegalHeading>Quién puede ver tus datos</LegalHeading>
      <p>
        Las personas con rol de administración de la tienda pueden ver los pedidos y el nombre y la dirección del
        destinatario, solo para prepararlos y enviarlos. No ven contraseñas ni datos de tarjeta.
      </p>

      <LegalHeading>Proveedores</LegalHeading>
      <p>
        Supabase aloja la base de datos y la autenticación. Stripe procesa los pagos de prueba.
        VERIFICAR los términos y la ubicación de tratamiento de cada proveedor antes de cualquier
        uso real.
      </p>

      <LegalHeading>Cuánto tiempo se conservan</LegalHeading>
      <p>
        Mientras exista la cuenta. Al darse de baja, la cuenta, el perfil y las direcciones se
        borran y los pedidos se anonimizan. VERIFICAR las obligaciones de conservación fiscal en un
        uso real.
      </p>

      <LegalHeading>Tus derechos</LegalHeading>
      <p>
        Un servicio real debe ofrecer canales para ejercer los derechos de acceso, rectificación y
        supresión, entre otros. VERIFICAR el contenido exacto con un asesor. Consulta también la{' '}
        <Link href="/cookies" className="text-accent-text underline">
          política de cookies
        </Link>
        .
      </p>
    </LegalPage>
  );
}
