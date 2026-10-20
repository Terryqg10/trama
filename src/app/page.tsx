import { AnimatedSection } from '@/components/home/AnimatedSection';
import { AutumnBanner } from '@/components/home/AutumnBanner';
import { DUAL_BANNER_SLIDES } from '@/components/home/dual-banner-slides';
import { DualBannerSlider } from '@/components/home/DualBannerSlider';
import { ExploreSection } from '@/components/home/ExploreSection';
import { HERO_SLIDES } from '@/components/home/hero-slides';
import { NewArrivals } from '@/components/home/NewArrivals';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { ShippingBanner } from '@/components/home/ShippingBanner';
import { TrustSection } from '@/components/home/TrustSection';
import { HeroSlider } from '@/components/layout/HeroSlider';

/** La portada lee las novedades de la BD: se regenera como mucho cada minuto. */
export const revalidate = 60;

/** Sección en contenedor (CA-115): ancho de la página, centrada y con el margen lateral del estilo. */
const BOXED = 'mx-auto max-w-(--layout-container) px-(--layout-gutter) py-16';

/**
 * Portada. Dos tipos de bloque (CA-115, T-070):
 * - A sangre (sin contenedor): hero, banner dividido, banner de otoño, banner de envío y newsletter. Su texto se alinea
 *   con el contenedor por dentro.
 * - En contenedor (`BOXED`): Explora, Novedades y la sección de confianza.
 */
export default function Home() {
  return (
    <>
      <HeroSlider slides={HERO_SLIDES} />
      <section className={BOXED}>
        <AnimatedSection>
          <ExploreSection />
        </AnimatedSection>
      </section>
      <AnimatedSection>
        <DualBannerSlider slides={DUAL_BANNER_SLIDES} />
      </AnimatedSection>
      <AnimatedSection>
        <AutumnBanner />
      </AnimatedSection>
      <AnimatedSection>
        <ShippingBanner />
      </AnimatedSection>
      <section className={BOXED}>
        <AnimatedSection>
          <NewArrivals />
        </AnimatedSection>
      </section>
      <div className="mx-auto max-w-(--layout-container) px-(--layout-gutter)">
        <TrustSection />
      </div>
      <NewsletterSection />
    </>
  );
}
