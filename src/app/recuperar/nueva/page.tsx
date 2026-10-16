import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { ResetPasswordForm } from '@/components/account/AuthForms';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Nueva contraseña' };

export default async function NuevaContrasenaPage() {
  // Solo se llega con la sesión que abre el enlace del correo.
  const { user } = await getCurrentUser();
  if (!user) redirect('/recuperar?error=enlace');
  return (
    <AuthPageShell title="Nueva contraseña">
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
