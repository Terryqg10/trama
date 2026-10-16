import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { RegisterForm } from '@/components/account/AuthForms';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default async function RegistroPage() {
  const { user } = await getCurrentUser();
  if (user) redirect('/cuenta');
  return (
    <AuthPageShell title="Crear cuenta" intro="Guarda tus direcciones y consulta tus pedidos.">
      <RegisterForm />
    </AuthPageShell>
  );
}
