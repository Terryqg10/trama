import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';
import { ExploreSection } from '@/components/home/ExploreSection';
import { Hero } from '@/components/home/Hero';
import { NewArrivals } from '@/components/home/NewArrivals';
import { ShippingBanner } from '@/components/home/ShippingBanner';

/** La portada lee las novedades de la BD: se regenera como mucho cada minuto. */
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Hero />
      <PageContainer>
        <ExploreSection />
      </PageContainer>
      <ShippingBanner />
      <PageContainer>
        <NewArrivals />
        <div className="mt-12">
          <ShippingInfo />
        </div>
      </PageContainer>
    </>
  );
}
