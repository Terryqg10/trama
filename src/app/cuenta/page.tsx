import type { Metadata } from 'next';
import Link from 'next/link';
import { ProfileForm } from '@/components/account/AccountForms';
import { PageContainer } from '@/components/PageContainer';
import { deleteAddressAction, logoutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Mi cuenta' };

const secondaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-accent-soft';

export default async function CuentaPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { aviso } = await searchParams;
  const { client, user } = await requireUser();

  const [profile, addresses] = await Promise.all([
    client.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    client
      .from('addresses')
      .select('id, recipient_name, line1, line2, postal_code, city, province')
      .order('created_at', { ascending: true }),
  ]);
  const loadFailed = profile.error !== null || addresses.error !== null;
  const rows = addresses.data ?? [];

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-display font-bold">Mi cuenta</h1>
          <form action={logoutAction}>
            <button type="submit" className={secondaryButton}>
              Cerrar sesión
            </button>
          </form>
        </div>

        {aviso === 'contrasena' ? (
          <p role="status" className="rounded-control border border-success px-4 py-3 text-sm font-medium text-success">
            Contraseña actualizada.
          </p>
        ) : null}

        {loadFailed ? (
          <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
            No hemos podido cargar tus datos. Recarga la página para reintentar.
          </p>
        ) : null}

        <section aria-labelledby="titulo-perfil">
          <h2 id="titulo-perfil" className="text-xl font-semibold">
            Tus datos
          </h2>
          <p className="mt-1 text-sm text-fg-muted">Email: {user.email}</p>
          <div className="mt-4 rounded-container border border-border bg-surface p-6">
            <ProfileForm fullName={profile.data?.full_name ?? ''} />
          </div>
        </section>

        <section aria-labelledby="titulo-direcciones">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="titulo-direcciones" className="text-xl font-semibold">
              Direcciones de envío
            </h2>
            <Link
              href="/cuenta/direcciones/nueva"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Añadir dirección
            </Link>
          </div>

          {rows.length === 0 && !loadFailed ? (
            <p className="mt-4 rounded-container border border-border bg-surface p-6 text-fg-muted">
              Sin direcciones guardadas.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {rows.map((address) => (
                <li key={address.id} className="rounded-container border border-border bg-surface p-6">
                  <p className="font-semibold">{address.recipient_name}</p>
                  <p className="mt-1 text-fg-muted">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}
                  </p>
                  <p className="text-fg-muted">
                    {address.postal_code} {address.city}, {address.province}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/cuenta/direcciones/${address.id}`}
                      aria-label={`Editar la dirección de ${address.recipient_name}, ${address.line1}`}
                      className={secondaryButton}
                    >
                      Editar
                    </Link>
                    <form action={deleteAddressAction}>
                      <input type="hidden" name="id" value={address.id} />
                      <button
                        type="submit"
                        aria-label={`Eliminar la dirección de ${address.recipient_name}, ${address.line1}`}
                        className={secondaryButton}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
