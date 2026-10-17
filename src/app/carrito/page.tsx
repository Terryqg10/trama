import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';
import { loadAccountCart } from '@/lib/cart/account';
import type { SavedCart } from '@/lib/cart/cart';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Carrito' };

export default async function CarritoPage() {
  const { client, user } = await getCurrentUser();
  let accountCart: SavedCart | undefined;
  let loadFailed = false;
  if (user) {
    try {
      accountCart = await loadAccountCart(client);
    } catch (error) {
      console.error('CarritoPage: no se pudo cargar el carrito de la cuenta', error instanceof Error ? error.message : 'error');
      loadFailed = true;
    }
  }

  return (
    <PageContainer>
      <h1 className="text-display font-bold">Carrito</h1>
      <noscript>
        <p className="mt-4 rounded-control border border-border-strong px-4 py-3 text-sm">
          El carrito necesita JavaScript: tus prendas se guardan en este navegador o en tu cuenta.
        </p>
      </noscript>
      <div className="mt-8">
        {loadFailed ? (
          <p role="alert" className="rounded-control border border-danger px-4 py-3 text-sm font-medium text-danger">
            No hemos podido cargar tu carrito. Recarga la página para reintentarlo.
          </p>
        ) : (
          <CartView {...(accountCart ? { initialAccountCart: accountCart } : {})} />
        )}
      </div>
      <div className="mt-12">
        <ShippingInfo />
      </div>
    </PageContainer>
  );
}
