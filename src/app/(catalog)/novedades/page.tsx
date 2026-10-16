import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/CatalogView';
import type { RawSearchParams } from '@/lib/catalog/filters';

export const metadata: Metadata = { title: 'Novedades' };

export default function NovedadesPage({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  return (
    <CatalogView
      title="Novedades"
      basePath="/novedades"
      scope={{ onlyNew: true }}
      searchParams={searchParams}
    />
  );
}
