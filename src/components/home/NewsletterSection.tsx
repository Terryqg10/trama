import { ShieldCheck, Tag, Truck } from 'lucide-react';
import type { ComponentType } from 'react';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';
import { NewsletterForm } from './NewsletterForm';

interface ValueProp {
  readonly Icon: ComponentType<{ readonly 'aria-hidden': 'true'; readonly className: string }>;
  readonly title: string;
  readonly text: string;
}

/**
 * Propuestas de valor de la tienda. Los textos son ciertos para Trama: el encargo decía «Más de 1.200 marcas» y
 * «Financiación en 3 plazos», que no lo son (Enmienda 26). El umbral sale de `shop.ts`.
 */
const VALUE_PROPS: readonly ValueProp[] = [
  { Icon: Tag, title: 'MODA URBANA', text: 'Ropa para ellos y para ellas.' },
  { Icon: Truck, title: 'ENVÍOS GRATIS', text: `A partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}.` },
  { Icon: ShieldCheck, title: 'PAGO SEGURO', text: 'Pago con tarjeta a través de Stripe.' },
];

/**
 * Cierre de la portada (CA-101, T-060): tres propuestas de valor y la suscripción a la newsletter. En móvil las
 * propuestas se apilan; desde `md`, tres columnas.
 */
export function NewsletterSection() {
  return (
    <>
      <section aria-label="Por qué Trama" data-testid="value-props" className="mx-auto max-w-(--layout-container) px-(--layout-gutter) py-10">
        <ul className="grid gap-8 text-center md:grid-cols-3">
          {VALUE_PROPS.map(({ Icon, title, text }) => (
            <li key={title} className="flex flex-col items-center">
              <Icon aria-hidden="true" className="size-8 text-accent-text" />
              <p className="mt-3 text-base font-bold text-fg">{title}</p>
              <p className="mt-1 text-fg-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="newsletter-titulo" data-testid="newsletter" className="bg-surface-muted px-(--layout-gutter) py-12 text-center">
        <h2 id="newsletter-titulo" className="text-2xl font-bold text-fg md:text-3xl">
          ¡Entérate de todas las novedades y ofertas!
        </h2>
        <NewsletterForm />
      </section>
    </>
  );
}
