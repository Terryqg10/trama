import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { LoginForm } from '@/components/account/AuthForms';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function AccesoPage() {
  const { user } = await getCurrentUser();
  if (user) redirect('/cuenta');
  return (
    <AuthPageShell title="Iniciar sesión">
      <LoginForm />
    </AuthPageShell>
  );
}
