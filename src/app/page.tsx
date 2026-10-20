import { PageContainer } from '@/components/PageContainer';
import { ShippingInfo } from '@/components/ShippingInfo';
import { Hero } from '@/components/home/Hero';

export default function Home() {
  return (
    <>
      <Hero />
      <PageContainer>
        <ShippingInfo />
      </PageContainer>
    </>
  );
}
