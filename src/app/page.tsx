import Link from 'next/link';
import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';

export default function Home() {
  return (
    <PageContainer>
      <section className="rounded-container bg-accent-soft p-8 sm:p-12">
        <h1 className="text-display font-bold text-fg">Trama</h1>
        <p className="mt-3 max-w-(--layout-prose-max) text-fg-muted">
          Ropa casual y de vestir para hombre y mujer: polos, camisas, blusas y pantalones.
        </p>
        <Link
          href="/novedades"
          className="mt-6 inline-flex min-h-11 items-center rounded-control bg-accent px-6 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Ver novedades
        </Link>
      </section>
      <div className="mt-8">
        <ShippingInfo />
      </div>
    </PageContainer>
  );
}
