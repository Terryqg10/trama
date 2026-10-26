import { describe, expect, it } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import { pickCompleteLook } from './complete-look';

// CA-153 (T-121, nivel unitario): qué productos se sugieren. Las tarjetas y el «+» los comprueba `CompleteLook` y el e2e `cart-drawer`.

function product(slug: string, overrides: { createdAt?: string; stock?: number; sizes?: string[] } = {}) {
  const sizes = overrides.sizes ?? ['S', 'M', 'L'];
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: `id-${slug}`,
      slug,
      name: `Producto ${slug}`,
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: overrides.createdAt ?? '2026-10-01T00:00:00Z',
      product_images: [{ path: `/products/${slug}.webp`, alt: `${slug}, color negro`, position: 0 }],
      product_variants: sizes.map((size) => ({
        id: `v-${slug}-${size}`,
        size,
        color: 'negro',
        price_cents: 2990,
        stock: overrides.stock ?? 5,
      })),
    }),
  );
}

describe('pickCompleteLook (CA-153)', () => {
  it('elige hasta 3, de los más recientes a los más antiguos', () => {
    const products = [
      product('a', { createdAt: '2026-10-01T00:00:00Z' }),
      product('b', { createdAt: '2026-10-04T00:00:00Z' }),
      product('c', { createdAt: '2026-10-03T00:00:00Z' }),
      product('d', { createdAt: '2026-10-02T00:00:00Z' }),
    ];
    expect(pickCompleteLook(products, new Set()).map((item) => item.slug)).toEqual(['b', 'c', 'd']);
  });

  it('excluye los productos que ya están en el carrito (por producto, no por variante)', () => {
    const products = [product('a'), product('b'), product('c'), product('d')];
    expect(pickCompleteLook(products, new Set(['a', 'c'])).map((item) => item.slug)).toEqual(['b', 'd']);
  });

  it('descarta los agotados y deja las tallas agotadas marcadas con su stock', () => {
    const agotado = product('agotado', { stock: 0 });
    const parcial = toCatalogProduct(
      catalogRowSchema.parse({
        id: 'id-parcial',
        slug: 'parcial',
        name: 'Parcial',
        gender: 'hombre',
        category: 'polos',
        occasion: 'casual',
        is_new: false,
        created_at: '2026-10-01T00:00:00Z',
        product_images: [],
        product_variants: [
          { id: 'v1', size: 'S', color: 'negro', price_cents: 2990, stock: 0 },
          { id: 'v2', size: 'M', color: 'negro', price_cents: 2990, stock: 2 },
        ],
      }),
    );
    const items = pickCompleteLook([agotado, parcial], new Set());
    expect(items.map((item) => item.slug)).toEqual(['parcial']);
    expect(items[0]?.sizes).toEqual([
      { variantId: 'v1', size: 'S', stock: 0 },
      { variantId: 'v2', size: 'M', stock: 2 },
    ]);
    expect(items[0]?.image).toBeNull();
  });

  it('sin candidatos devuelve una lista vacía', () => {
    expect(pickCompleteLook([], new Set())).toEqual([]);
    expect(pickCompleteLook([product('a')], new Set(['a']))).toEqual([]);
  });
});
