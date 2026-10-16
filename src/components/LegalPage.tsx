import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageContainer } from './PageContainer';

interface LegalPageProps {
  readonly title: string;
  readonly children: ReactNode;
}

/** Estructura común de las páginas legales de ejemplo (RF-12, CA-34). */
export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <PageContainer>
      <article className="max-w-(--layout-prose-max)">
        <h1 className="text-display font-bold">{title}</h1>
        <p
          role="note"
          className="mt-6 rounded-card border border-border-strong bg-accent-soft p-4 text-sm text-fg"
        >
          <strong>Contenido ficticio sin valor jurídico.</strong> Trama es un proyecto de portfolio.
          Este texto es un ejemplo y no sustituye a un texto legal revisado por un profesional.
        </p>
        <div className="mt-6 space-y-4 text-fg">{children}</div>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Volver al inicio
        </Link>
      </article>
    </PageContainer>
  );
}

export function LegalHeading({ children }: { readonly children: ReactNode }) {
  return <h2 className="pt-4 text-lg font-semibold text-fg">{children}</h2>;
}
