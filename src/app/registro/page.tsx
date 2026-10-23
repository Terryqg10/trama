import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { RegisterForm } from '@/components/account/AuthForms';
import { DemoNotice } from '@/components/DemoNotice';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default async function RegistroPage() {
  const { user } = await getCurrentUser();
  if (user) redirect('/cuenta');
  return (
    <AuthPageShell title="Crear cuenta" intro="Guarda tus direcciones y consulta tus pedidos.">
      <div className="mb-6">
        <DemoNotice testId="demo-notice-register">Demo: puedes registrarte con cualquier email, no hace falta confirmarlo.</DemoNotice>
      </div>
      <RegisterForm />
    </AuthPageShell>
  );
}
