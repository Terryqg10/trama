import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = { title: 'Ofertas' };

export default function OfertasPage() {
  return (
    <PageContainer>
      <h1 className="text-display font-bold">Ofertas</h1>
      <div className="mt-8">
        <EmptyState
          title="Ahora mismo no hay ofertas"
          description="Cuando haya prendas rebajadas aparecerán aquí."
          action={{ href: '/novedades', label: 'Ver novedades' }}
        />
      </div>
    </PageContainer>
  );
}
