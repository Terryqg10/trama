import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import type { RawSearchParams } from '@/lib/catalog/filters';
import { getProductBySlug } from '@/lib/catalog/queries';
import { getCurrentUser } from '@/lib/auth/session';
import { getSizeGuide } from '@/lib/catalog/size-guide';
import { addFavorite, isFavorite } from '@/lib/favorites/favorites';

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
  const { client, user } = await getCurrentUser();
  const query = await searchParams;
  // Tras iniciar sesión desde el corazón (CA-76): se deja el producto en favoritos y se limpia el parámetro.
  if (user && query['favorito'] === '1') {
    await addFavorite(client, user.id, product.id);
    redirect(`/producto/${product.slug}`);
  }
  const favorite = user ? await isFavorite(client, product.id) : false;
  return (
    <ProductDetailView
      product={product}
      sizeGuide={sizeGuide}
      searchParams={query}
      signedIn={user !== null}
      favorite={favorite}
    />
  );
}
