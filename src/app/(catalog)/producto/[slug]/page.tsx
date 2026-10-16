import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import type { RawSearchParams } from '@/lib/catalog/filters';
import { getProductBySlug } from '@/lib/catalog/queries';
import { getSizeGuide } from '@/lib/catalog/size-guide';

interface PageProps {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? product.name : 'Producto no encontrado' };
}

/** Ficha de producto (RF-02). Un slug inválido, inexistente o inactivo da 404. */
export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const sizeGuide = await getSizeGuide(product.category);
  return (
    <ProductDetailView product={product} sizeGuide={sizeGuide} searchParams={await searchParams} />
  );
}
