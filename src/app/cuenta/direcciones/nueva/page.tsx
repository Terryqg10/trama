import type { Metadata } from 'next';
import { AddressForm, emptyAddress } from '@/components/account/AccountForms';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Nueva dirección' };

export default async function NuevaDireccionPage() {
  await requireUser();
  return (
    <AuthPageShell title="Nueva dirección">
      <AddressForm initial={emptyAddress} />
    </AuthPageShell>
  );
}
