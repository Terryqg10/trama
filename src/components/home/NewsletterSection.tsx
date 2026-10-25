import { NewsletterForm } from './NewsletterForm';

/**
 * Newsletter de la portada (CA-101, T-060). Las tres propuestas de valor que llevaba encima pasaron a la sección de
 * confianza (CA-111, T-067): repetían el envío gratis del banner.
 */
export function NewsletterSection() {
  return (
    <section aria-labelledby="newsletter-titulo" data-testid="newsletter" className="bg-linear-to-br from-accent/10 via-surface to-surface px-(--layout-gutter) py-12 text-center">
      <h2 id="newsletter-titulo" className="text-2xl font-bold text-fg md:text-3xl">
        ¡Entérate de todas las novedades y ofertas!
      </h2>
      <NewsletterForm />
    </section>
  );
}
