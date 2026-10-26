import Link from 'next/link';
import { PackageCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import type { ComponentType } from 'react';
import { RETURN_WINDOW_DAYS, SHIPPING_FLAT_CENTS, formatEuros } from '@/lib/domain/shop';

interface Pillar {
  readonly Icon: ComponentType<{ readonly 'aria-hidden': 'true'; readonly className: string }>;
  readonly title: string;
  readonly text: string;
  readonly badge?: string;
  readonly link?: { readonly href: '/cuenta/pedidos'; readonly label: string };
}

/**
 * Cuatro motivos para comprar con confianza. La tarifa y los días salen de `shop.ts` (el umbral de envío gratis, solo en la
 * franja de envío que la precede: CA-145, T-111); el resto del texto
 * (24-48 h, devolución gratuita, reembolso en 5 días) es de ejemplo, como dice la nota de la sección (Enmienda 28).
 */
const PILLARS: readonly Pillar[] = [
  {
    Icon: Truck,
    title: 'Envío en 24-48 h',
    text: `Tarifa plana de ${formatEuros(SHIPPING_FLAT_CENTS)} por pedido.`,
  },
  {
    Icon: RotateCcw,
    title: `${RETURN_WINDOW_DAYS} días para devolver`,
    text: 'Si no te encaja, es gratis y te reembolsamos en 5 días laborables.',
  },
  {
    Icon: ShieldCheck,
    title: 'Pago 100 % seguro',
    text: 'Pagas con tarjeta a través de Stripe: tus datos bancarios nunca pasan por Trama.',
  },
  {
    Icon: PackageCheck,
    title: 'Sigue tu pedido',
    text: 'Consulta el estado de tus compras desde tu cuenta, cuando quieras.',
    link: { href: '/cuenta/pedidos', label: 'Ir a mis pedidos' },
  },
];

/**
 * Sección de confianza de la portada (CA-111, T-067): sustituye al bloque «Envío y devolución» y a las propuestas de
 * valor que había sobre el newsletter, que repetían el envío gratis. La ficha y el carrito siguen con `ShippingInfo`.
 * 1 columna en móvil, 2 desde `sm` y 4 desde `lg`.
 */
export function TrustSection() {
  return (
    <section aria-labelledby="confianza-titulo" data-testid="trust-section" className="py-12">
      <div className="text-center">
        <h2 id="confianza-titulo" className="text-2xl font-bold text-fg md:text-3xl">
          Compra con tranquilidad
        </h2>
        <p className="mx-auto mt-2 max-w-(--layout-prose-max) text-fg-muted">
          Todo claro antes de pagar.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map(({ Icon, title, text, badge, link }) => (
          <li
            key={title}
            data-testid="trust-pillar"
            className="flex flex-col items-center rounded-card border border-border bg-surface p-6 text-center shadow-card"
          >
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Icon aria-hidden="true" className="size-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
            <p className="mt-2 text-sm text-fg-muted">{text}</p>
            {badge ? (
              <span className="mt-4 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">{badge}</span>
            ) : null}
            {link ? (
              <Link
                href={link.href}
                className="mt-4 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-accent-text hover:underline"
              >
                {link.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-6 max-w-(--layout-prose-max) text-center text-sm text-fg-muted">
        Condiciones de ejemplo: Trama es un proyecto de portfolio y no gestiona envíos ni devoluciones reales.{' '}
        <Link href="/condiciones" className="font-medium text-accent-text underline-offset-2 hover:underline">
          Ver condiciones
        </Link>
      </p>
    </section>
  );
}
