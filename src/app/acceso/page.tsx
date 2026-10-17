import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { LoginForm } from '@/components/account/AuthForms';
import { nextPathSchema } from '@/lib/auth/schemas';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function AccesoPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { siguiente } = await searchParams;
  const next = nextPathSchema.safeParse(siguiente);
  const { user } = await getCurrentUser();
  if (user) redirect(next.success ? next.data : '/cuenta');
  return (
    <AuthPageShell
      title="Iniciar sesión"
      {...(next.success ? { intro: 'Inicia sesión para finalizar tu compra. Tu carrito se conserva.' } : {})}
    >
      <LoginForm {...(next.success ? { next: next.data } : {})} />
    </AuthPageShell>
  );
}
