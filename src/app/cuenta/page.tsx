import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = { title: 'Cuenta' };

export default function CuentaPage() {
  return (
    <PageContainer>
      <h1 className="text-display font-bold">Cuenta</h1>
      <div className="mt-8">
        <EmptyState
          title="El acceso a tu cuenta estará disponible pronto"
          description="Aquí podrás iniciar sesión, ver tus pedidos y gestionar tus direcciones."
          action={{ href: '/', label: 'Volver al inicio' }}
        />
      </div>
    </PageContainer>
  );
}
