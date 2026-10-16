import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = { title: 'Carrito' };

export default function CarritoPage() {
  return (
    <PageContainer>
      <h1 className="text-display font-bold">Carrito</h1>
      <div className="mt-8">
        <EmptyState
          title="Tu carrito está vacío"
          description="Añade prendas desde el catálogo para verlas aquí."
          action={{ href: '/novedades', label: 'Ver novedades' }}
        />
      </div>
    </PageContainer>
  );
}
