import type { ReactNode } from 'react';
import { PageContainer } from '@/components/PageContainer';

/** Marco de las pantallas de acceso: una columna estrecha, centrada y legible en móvil. */
export function AuthPageShell({
  title,
  intro,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly children: ReactNode;
}) {
  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <h1 className="text-display font-bold">{title}</h1>
        {intro ? <p className="mt-3 text-fg-muted">{intro}</p> : null}
        <div className="mt-8 rounded-container border border-border bg-surface p-6">{children}</div>
      </div>
    </PageContainer>
  );
}
