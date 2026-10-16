import Link from 'next/link';
import type { Route } from 'next';

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly action: { readonly href: Route; readonly label: string };
}

/** Estado vacío estándar (spec, sección 6). */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-container border border-border bg-surface p-8 text-center">
      <p className="text-lg font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-(--layout-prose-max) text-fg-muted">{description}</p>
      <Link
        href={action.href}
        className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
      >
        {action.label}
      </Link>
    </div>
  );
}
