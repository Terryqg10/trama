import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/CatalogView';
import type { RawSearchParams } from '@/lib/catalog/filters';

export const metadata: Metadata = { title: 'Mujer' };

export default function MujerPage({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  return (
    <CatalogView
      title="Mujer"
      basePath="/mujer"
      scope={{ gender: 'mujer' }}
      searchParams={searchParams}
    />
  );
}
