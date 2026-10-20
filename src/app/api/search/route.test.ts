import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProduct } from '@/lib/catalog/product';

// CA-106 (nivel de ruta): normalización, mínimo de 2 caracteres, tope de 5, forma de la respuesta y errores.

const searchProducts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/catalog/queries', () => ({ searchProducts }));

import { GET } from './route';

function product(index: number, images: CatalogProduct['images'] = [{ path: `/images/products/p${index}.webp`, alt: `Foto ${index}` }]): CatalogProduct {
  return {
    id: `id-${index}`,
    slug: `producto-${index}`,
    name: `Camiseta ${index}`,
    gender: 'hombre',
    category: 'camisetas',
    occasion: 'casual',
    isNew: false,
    createdAt: '2026-10-01T00:00:00Z',
    fromPriceCents: 2990 + index,
    images,
    colors: ['negro'],
    sizes: ['M'],
    variants: [],
    inStock: true,
  };
}

const request = (q?: string) => new Request(`http://localhost/api/search${q === undefined ? '' : `?q=${encodeURIComponent(q)}`}`);

describe('GET /api/search', () => {
  beforeEach(() => {
    searchProducts.mockReset();
  });

  it.each([undefined, '', ' ', 'a', ' a '])('devuelve [] con %j y no consulta la base de datos', async (q) => {
    const response = await GET(request(q));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(searchProducts).not.toHaveBeenCalled();
  });

  it('con 2 o más caracteres consulta con el texto normalizado y devuelve como mucho 5 productos', async () => {
    searchProducts.mockResolvedValue([1, 2, 3, 4, 5, 6, 7].map((n) => product(n)));
    const response = await GET(request("  CAMI   *se'ta; "));
    expect(searchProducts).toHaveBeenCalledWith('CAMI se ta');
    const body = (await response.json()) as unknown[];
    expect(body).toHaveLength(5);
  });

  it('cada producto lleva id, slug, nombre, precio «desde» en céntimos e imagen de la posición 0', async () => {
    searchProducts.mockResolvedValue([product(1)]);
    const response = await GET(request('camiseta'));
    expect(await response.json()).toEqual([
      { id: 'id-1', slug: 'producto-1', name: 'Camiseta 1', priceCents: 2991, image: { path: '/images/products/p1.webp', alt: 'Foto 1' } },
    ]);
  });

  it('un producto sin imagen devuelve image: null', async () => {
    searchProducts.mockResolvedValue([product(1, [])]);
    const body = (await (await GET(request('camiseta'))).json()) as Array<{ image: unknown }>;
    expect(body[0]?.image).toBeNull();
  });

  it('se puede cachear en el borde', async () => {
    searchProducts.mockResolvedValue([]);
    const response = await GET(request('camiseta'));
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=30');
  });

  it('un fallo de datos responde 500 sin detalle', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    searchProducts.mockRejectedValue(new Error('password authentication failed for user postgres'));
    const response = await GET(request('camiseta'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('postgres');
    log.mockRestore();
  });
});
