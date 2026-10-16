import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddressForm } from '@/components/account/AccountForms';
import { AuthPageShell } from '@/components/account/AuthPageShell';
import { addressIdSchema } from '@/lib/auth/schemas';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Editar dirección' };

export default async function EditarDireccionPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const parsedId = addressIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();

  const { client } = await requireUser();
  // RLS: solo devuelve la fila si pertenece al usuario de la sesión.
  const { data } = await client
    .from('addresses')
    .select('id, recipient_name, line1, line2, postal_code, city, province')
    .eq('id', parsedId.data)
    .maybeSingle();
  if (!data) notFound();

  return (
    <AuthPageShell title="Editar dirección">
      <AddressForm
        initial={{
          id: data.id,
          recipientName: data.recipient_name,
          line1: data.line1,
          line2: data.line2 ?? '',
          postalCode: data.postal_code,
          city: data.city,
          province: data.province,
        }}
      />
    </AuthPageShell>
  );
}
