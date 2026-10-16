import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { RecoverForm } from '@/components/account/AuthForms';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default async function RecuperarPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  return (
    <AuthPageShell
      title="Recuperar contraseña"
      intro="Escribe tu email y te enviaremos un enlace para elegir una contraseña nueva."
    >
      {error === 'enlace' ? (
        <p role="alert" className="mb-5 rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
          El enlace no es válido o ha caducado. Pide uno nuevo.
        </p>
      ) : null}
      <RecoverForm />
    </AuthPageShell>
  );
}
