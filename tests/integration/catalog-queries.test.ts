import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getProductBySlug, listProducts } from '../../src/lib/catalog/queries';
import type { CatalogFilters } from '../../src/lib/catalog/filters';
import { publicClient, serviceClient } from './helpers';

const idSchema = z.object({ id: z.string() });

// Todas las variantes de estos tests llevan un color único: filtrar por él aísla
// los productos de la prueba de cualquier dato real o de ejemplo que haya en la BD.
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

let admin: SupabaseClient;
const createdProductIds: string[] = [];
const slugs: Record<'p1' | 'p2' | 'p3' | 'p4' | 'p5', string> = {
  p1: `t005a-p1-${randomUUID().slice(0, 6)}`,
  p2: `t005a-p2-${randomUUID().slice(0, 6)}`,
  p3: `t005a-p3-${randomUUID().slice(0, 6)}`,
  p4: `t005a-p4-${randomUUID().slice(0, 6)}`,
  p5: `t005a-p5-${randomUUID().slice(0, 6)}`,
};

async function createProduct(
  slug: string,
  fields: Record<string, unknown>,
  variants: ReadonlyArray<{ size: string; price_cents: number; stock: number }>,
): Promise<string> {
  const product = await admin
    .from('products')
    .insert({ slug, name: `Producto ${slug}`, ...fields })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  const id = idSchema.parse(product.data).id;
  createdProductIds.push(id);

  const inserted = await admin
    .from('product_variants')
    .insert(variants.map((v) => ({ product_id: id, color: TAG, ...v })));
  if (inserted.error) throw new Error(`createVariants: ${inserted.error.message}`);
  return id;
}

function filters(overrides: Partial<CatalogFilters> = {}): CatalogFilters {
  return { onlyNew: false, sort: 'novedades', color: TAG, ...overrides };
}

async function slugsFor(overrides: Partial<CatalogFilters> = {}): Promise<string[]> {
  const products = await listProducts(filters(overrides), publicClient());
  return products.map((p) => p.slug).sort();
}

const sorted = (...values: string[]) => [...values].sort();

beforeAll(async () => {
  admin = serviceClient();

  const p1 = await createProduct(
    slugs.p1,
    {
      gender: 'mujer',
      category: 'blusas',
      occasion: 'vestir',
      is_new: true,
      description: 'Blusa de prueba',
      composition: '100% algodón',
      care: 'Lavar a 30 °C',
      model_height_cm: 175,
      model_size: 'S',
    },
    [
      { size: 'S', price_cents: 3000, stock: 5 },
      { size: 'M', price_cents: 3500, stock: 0 },
    ],
  );
  await createProduct(slugs.p2, { gender: 'hombre', category: 'blusas', occasion: 'casual' }, [
    { size: 'M', price_cents: 2000, stock: 4 },
  ]);
  await createProduct(slugs.p3, { gender: 'mujer', category: 'polos', occasion: 'casual' }, [
    { size: 'M', price_cents: 2500, stock: 4 },
  ]);
  await createProduct(slugs.p4, { gender: 'hombre', category: 'camisas', occasion: 'vestir' }, [
    { size: 'L', price_cents: 8000, stock: 3 },
  ]);
  await createProduct(
    slugs.p5,
    { gender: 'mujer', category: 'blusas', occasion: 'vestir', active: false },
    [{ size: 'S', price_cents: 1000, stock: 9 }],
  );

  // Imágenes de P1 insertadas en orden inverso para comprobar la ordenación.
  const images = await admin.from('product_images').insert([
    { product_id: p1, path: '/products/blusas-azul.svg', alt: 'Blusa, color azul', position: 1 },
    { product_id: p1, path: '/products/blusas-blanco.svg', alt: 'Blusa, color blanco', position: 0 },
  ]);
  if (images.error) throw new Error(`images: ${images.error.message}`);
});

afterAll(async () => {
  // Si beforeAll falló antes de crear el cliente, no hay nada que limpiar.
  if (!admin) return;
  if (createdProductIds.length > 0) {
    await admin.from('products').delete().in('id', createdProductIds);
  }
});

describe('listProducts: filtros (CA-01 a nivel de consulta)', () => {
  it('mujer + blusas devuelve solo blusas de mujer', async () => {
    const result = await listProducts(filters({ gender: 'mujer', category: 'blusas' }), publicClient());
    expect(result.length).toBeGreaterThan(0);
    for (const product of result) {
      expect(product.gender).toBe('mujer');
      expect(product.category).toBe('blusas');
    }
    expect(result.map((p) => p.slug)).toEqual([slugs.p1]);
  });

  it('hombre + blusas no incluye las de mujer', async () => {
    expect(await slugsFor({ gender: 'hombre', category: 'blusas' })).toEqual([slugs.p2]);
  });

  it('sin filtros de género ni categoría devuelve todos los activos de la prueba', async () => {
    expect(await slugsFor()).toEqual(sorted(slugs.p1, slugs.p2, slugs.p3, slugs.p4));
  });
});

describe('listProducts: otros filtros (base de CA-26, CA-27 y CA-32)', () => {
  it('talla con stock: S está disponible en P1', async () => {
    expect(await slugsFor({ size: 'S' })).toEqual([slugs.p1]);
  });

  it('talla agotada: M de P1 no cuenta, aunque exista la variante', async () => {
    expect(await slugsFor({ size: 'M' })).toEqual(sorted(slugs.p2, slugs.p3));
  });

  it('ocasión vestir', async () => {
    expect(await slugsFor({ occasion: 'vestir' })).toEqual(sorted(slugs.p1, slugs.p4));
  });

  it('ocasión casual', async () => {
    expect(await slugsFor({ occasion: 'casual' })).toEqual(sorted(slugs.p2, slugs.p3));
  });

  it('solo novedades', async () => {
    expect(await slugsFor({ onlyNew: true })).toEqual([slugs.p1]);
  });

  it('precio mínimo actúa sobre las variantes', async () => {
    expect(await slugsFor({ minPriceCents: 5000 })).toEqual([slugs.p4]);
  });

  it('precio máximo actúa sobre las variantes', async () => {
    expect(await slugsFor({ maxPriceCents: 2400 })).toEqual([slugs.p2]);
  });

  it('rango de precios', async () => {
    expect(await slugsFor({ minPriceCents: 2400, maxPriceCents: 3100 })).toEqual(
      sorted(slugs.p1, slugs.p3),
    );
  });

  it('combina varios filtros', async () => {
    expect(await slugsFor({ gender: 'hombre', occasion: 'vestir', minPriceCents: 5000 })).toEqual([
      slugs.p4,
    ]);
  });

  it('un color inexistente no devuelve nada', async () => {
    const result = await listProducts(filters({ color: 'colornoexiste' }), publicClient());
    expect(result).toEqual([]);
  });
});

describe('listProducts: orden', () => {
  it('precio ascendente', async () => {
    const result = await listProducts(filters({ sort: 'precio-asc' }), publicClient());
    expect(result.map((p) => p.slug)).toEqual([slugs.p2, slugs.p3, slugs.p1, slugs.p4]);
  });

  it('precio descendente', async () => {
    const result = await listProducts(filters({ sort: 'precio-desc' }), publicClient());
    expect(result.map((p) => p.slug)).toEqual([slugs.p4, slugs.p1, slugs.p3, slugs.p2]);
  });

  it('novedades: el producto nuevo va primero', async () => {
    const result = await listProducts(filters({ sort: 'novedades' }), publicClient());
    expect(result[0]?.slug).toBe(slugs.p1);
  });
});

describe('listProducts: forma del resultado', () => {
  it('calcula precio desde, tallas con stock e imágenes ordenadas', async () => {
    const [product] = await listProducts(filters({ gender: 'mujer', category: 'blusas' }), publicClient());
    expect(product?.fromPriceCents).toBe(3000);
    expect(product?.sizes).toEqual(['S']);
    expect(product?.inStock).toBe(true);
    expect(product?.colors).toEqual([TAG]);
    expect(product?.images.map((i) => i.path)).toEqual([
      '/products/blusas-blanco.svg',
      '/products/blusas-azul.svg',
    ]);
  });
});

describe('RLS en la capa de consulta', () => {
  it('un producto inactivo no se devuelve a un anónimo', async () => {
    expect(await slugsFor()).not.toContain(slugs.p5);
  });

  it('ni siquiera filtrando exactamente por él', async () => {
    expect(await slugsFor({ gender: 'mujer', category: 'blusas', occasion: 'vestir' })).toEqual([
      slugs.p1,
    ]);
  });
});

describe('getProductBySlug', () => {
  it('devuelve la ficha con variantes, composición y datos del modelo', async () => {
    const product = await getProductBySlug(slugs.p1, publicClient());
    expect(product).not.toBeNull();
    expect(product?.variants).toHaveLength(2);
    expect(product?.composition).toBe('100% algodón');
    expect(product?.care).toBe('Lavar a 30 °C');
    expect(product?.modelHeightCm).toBe(175);
    expect(product?.modelSize).toBe('S');
    expect(product?.sizes).toEqual(['S']);
  });

  it('devuelve null para un producto inactivo', async () => {
    expect(await getProductBySlug(slugs.p5, publicClient())).toBeNull();
  });

  it('devuelve null para un slug que no existe', async () => {
    expect(await getProductBySlug('no-existe-este-producto', publicClient())).toBeNull();
  });

  it('devuelve null (sin consultar) para un slug con formato inválido', async () => {
    expect(await getProductBySlug("x'; drop table products;--", publicClient())).toBeNull();
  });
});
