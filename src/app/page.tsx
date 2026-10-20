import { PageContainer } from '@/components/PageContainer';
import { AnimatedSection } from '@/components/home/AnimatedSection';
import { AutumnBanner } from '@/components/home/AutumnBanner';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HERO_SLIDES } from '@/components/home/hero-slides';
import { NewArrivals } from '@/components/home/NewArrivals';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { ShippingBanner } from '@/components/home/ShippingBanner';
import { TrustSection } from '@/components/home/TrustSection';
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
        <AnimatedSection className="mt-10">
          <AutumnBanner />
        </AnimatedSection>
      </PageContainer>
      <AnimatedSection>
        <ShippingBanner />
      </AnimatedSection>
      <PageContainer>
        <AnimatedSection>
          <NewArrivals />
        </AnimatedSection>
        <TrustSection />
      </PageContainer>
      <NewsletterSection />
    </>
  );
}
