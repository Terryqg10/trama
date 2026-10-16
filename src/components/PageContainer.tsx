import type { ReactNode } from 'react';

export function PageContainer({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mx-auto max-w-(--layout-container) px-(--layout-gutter) py-10">{children}</div>
  );
}
