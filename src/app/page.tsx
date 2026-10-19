import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';
import { Hero } from '@/components/home/Hero';

export default function Home() {
  return (
    <PageContainer>
      <Hero />
      <div className="mt-8">
        <ShippingInfo />
      </div>
    </PageContainer>
  );
}
