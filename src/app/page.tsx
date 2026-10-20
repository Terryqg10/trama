import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';
import { AnimatedSection } from '@/components/home/AnimatedSection';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HERO_SLIDES } from '@/components/home/hero-slides';
import { NewArrivals } from '@/components/home/NewArrivals';
import { ShippingBanner } from '@/components/home/ShippingBanner';
import { HeroSlider } from '@/components/layout/HeroSlider';

/** La portada lee las novedades de la BD: se regenera como mucho cada minuto. */
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <HeroSlider slides={HERO_SLIDES} />
      <PageContainer>
        <AnimatedSection>
          <ExploreSection />
        </AnimatedSection>
      </PageContainer>
      <AnimatedSection>
        <ShippingBanner />
      </AnimatedSection>
      <PageContainer>
        <AnimatedSection>
          <NewArrivals />
        </AnimatedSection>
        <div className="mt-12">
          <ShippingInfo />
        </div>
      </PageContainer>
    </>
  );
}
