import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/CatalogView';
import type { RawSearchParams } from '@/lib/catalog/filters';

export const metadata: Metadata = { title: 'Hombre' };

export default function HombrePage({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  return (
    <CatalogView
      title="Hombre"
      basePath="/hombre"
      scope={{ gender: 'hombre' }}
      searchParams={searchParams}
    />
  );
}
