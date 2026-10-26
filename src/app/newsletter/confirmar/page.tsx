import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { confirmNewsletterAction } from '@/app/actions/newsletter-confirm';
import { PageContainer } from '@/components/PageContainer';
import { confirmTokenSchema } from '@/lib/newsletter/token';

export const metadata: Metadata = { title: 'Confirmar suscripción', robots: { index: false } };

const resultSchema = z.enum(['confirmed', 'expired', 'invalid', 'error']);

const buttonClass =
  'inline-flex min-h-12 items-center justify-center rounded-control bg-accent px-6 text-base font-semibold text-accent-fg hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const linkClass =
  'inline-flex min-h-11 items-center rounded-control px-2 font-medium text-accent-text underline underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const OUTCOMES = {
  confirmed: { title: 'Suscripción confirmada', text: 'Gracias: ya estás suscrito a las novedades y ofertas de Trama.', again: false },
  expired: { title: 'El enlace ha caducado', text: 'Los enlaces de confirmación duran 24 horas. Vuelve a suscribirte para recibir uno nuevo.', again: true },
  invalid: { title: 'Este enlace no es válido', text: 'Ya se ha usado o no existe. Si aún no has confirmado tu suscripción, vuelve a suscribirte.', again: true },
  error: { title: 'No hemos podido confirmar', text: 'Ha habido un problema. Vuelve a abrir el enlace e inténtalo de nuevo.', again: false },
} as const;

/**
 * Confirmación de la newsletter (CA-103, T-061, Enmienda 50). Abrir el enlace NO confirma: enseña un botón que envía un
 * formulario (funciona sin JavaScript), porque un GET no debe cambiar datos. Tras confirmar, la acción vuelve aquí con el
 * resultado. Todo lo que llega por la URL se valida con Zod.
 */
export default async function ConfirmarNewsletterPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = resultSchema.safeParse(params.resultado);
  const token = confirmTokenSchema.safeParse(params.token);

  return (
    <PageContainer>
      <div className="mx-auto max-w-xl rounded-container border border-border bg-surface p-8 text-center">
        {result.success ? (
          <div data-testid="newsletter-confirm-result" data-result={result.data}>
            <h1 className="text-display font-bold">{OUTCOMES[result.data].title}</h1>
            <p className="mt-4 text-fg-muted">{OUTCOMES[result.data].text}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className={buttonClass}>
                Volver a la tienda
              </Link>
              {OUTCOMES[result.data].again ? (
                <Link href="/#newsletter-titulo" className={linkClass}>
                  Suscribirme de nuevo
                </Link>
              ) : null}
            </div>
          </div>
        ) : token.success ? (
          <form action={confirmNewsletterAction} data-testid="newsletter-confirm-form">
            <h1 className="text-display font-bold">Confirma tu suscripción</h1>
            <p className="mt-4 text-fg-muted">Pulsa el botón para empezar a recibir las novedades y ofertas de Trama.</p>
            <input type="hidden" name="token" value={token.data} />
            <button type="submit" data-testid="newsletter-confirm-submit" className={`${buttonClass} mt-6`}>
              Confirmar mi suscripción
            </button>
          </form>
        ) : (
          <div data-testid="newsletter-confirm-result" data-result="invalid">
            <h1 className="text-display font-bold">{OUTCOMES.invalid.title}</h1>
            <p className="mt-4 text-fg-muted">{OUTCOMES.invalid.text}</p>
            <div className="mt-6">
              <Link href="/" className={buttonClass}>
                Volver a la tienda
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
