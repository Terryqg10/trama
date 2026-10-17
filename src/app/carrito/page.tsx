import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';

export const metadata: Metadata = { title: 'Carrito' };

export default function CarritoPage() {
  return (
    <PageContainer>
      <h1 className="text-display font-bold">Carrito</h1>
      <noscript>
        <p className="mt-4 rounded-control border border-border-strong px-4 py-3 text-sm">
          El carrito necesita JavaScript: tus prendas se guardan en este navegador.
        </p>
      </noscript>
      <div className="mt-8">
        <CartView />
      </div>
      <div className="mt-12">
        <ShippingInfo />
      </div>
    </PageContainer>
  );
}
