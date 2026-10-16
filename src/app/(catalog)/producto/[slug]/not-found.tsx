import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';

/** 404 de la ficha (SPEC-001, sección 6): con enlace al catálogo. */
export default function ProductNotFound() {
  return (
    <PageContainer>
      <h1 className="text-display font-bold">Producto no encontrado</h1>
      <div className="mt-8">
        <EmptyState
          title="No hemos encontrado este producto"
          description="Puede que ya no esté disponible o que el enlace no sea correcto."
          action={{ href: '/novedades', label: 'Ver el catálogo' }}
        />
      </div>
    </PageContainer>
  );
}
