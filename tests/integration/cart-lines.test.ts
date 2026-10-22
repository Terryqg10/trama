import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MAX_CART_LINES } from '../../src/lib/cart/cart';
import { fetchCartLines } from '../../src/lib/cart/lines';
import { publicClient, serviceClient } from './helpers';

// T-018 (CA-62): las líneas del carrito se leen con el cliente público. Una variante de un producto
// retirado (inactivo) o que no existe no se devuelve, y la interfaz la muestra como «no disponible».

const idSchema = z.object({ id: z.string() });
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

let admin: SupabaseClient;
const productIds: string[] = [];
let activeVariantId = '';
let retiredVariantId = '';

async function createProductWithVariant(slug: string, active: boolean): Promise<string> {
  const product = await admin
    .from('products')
    .insert({
      slug,
      name: `Producto ${slug}`,
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      active,
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  const id = idSchema.parse(product.data).id;
  productIds.push(id);

  const variant = await admin
    .from('product_variants')
    .insert({ product_id: id, size: 'M', color: TAG, price_cents: 1234, stock: 3 })
    .select('id')
    .single();
  if (variant.error) throw new Error(`createVariant: ${variant.error.message}`);
  return idSchema.parse(variant.data).id;
}

beforeAll(async () => {
  admin = serviceClient();
  activeVariantId = await createProductWithVariant(`t018-activo-${randomUUID().slice(0, 6)}`, true);
  retiredVariantId = await createProductWithVariant(`t018-retirado-${randomUUID().slice(0, 6)}`, false);
});

afterAll(async () => {
  if (!admin) return;
  if (productIds.length > 0) await admin.from('products').delete().in('id', productIds);
});

describe('fetchCartLines (CA-62, a nivel de consulta)', () => {
  it('devuelve precio, stock y datos de la variante de un producto activo', async () => {
    const lines = await fetchCartLines([activeVariantId], publicClient());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      variantId: activeVariantId,
      size: 'M',
      color: TAG,
      priceCents: 1234,
      compareAtCents: null,
      stock: 3,
      image: null,
    });
  });

  // CA-126 (T-084): el precio anterior de la variante llega con la línea, o `null`.
  it('trae el precio anterior (compare_at_cents) de una variante rebajada y null de una que no lo está', async () => {
    const discounted = await admin
      .from('product_variants')
      .insert({ product_id: productIds[0], size: 'L', color: TAG, price_cents: 1000, compare_at_cents: 1500, stock: 2 })
      .select('id')
      .single();
    if (discounted.error) throw new Error(`createDiscounted: ${discounted.error.message}`);
    const discountedId = idSchema.parse(discounted.data).id;
    const lines = await fetchCartLines([activeVariantId, discountedId], publicClient());
    const byId = new Map(lines.map((line) => [line.variantId, line]));
    expect(byId.get(discountedId)).toMatchObject({ priceCents: 1000, compareAtCents: 1500 });
    expect(byId.get(activeVariantId)?.compareAtCents).toBeNull();
  });

  it('no devuelve la variante de un producto retirado ni una variante que no existe', async () => {
    const lines = await fetchCartLines([activeVariantId, retiredVariantId, randomUUID()], publicClient());
    expect(lines.map((line) => line.variantId)).toEqual([activeVariantId]);
  });

  it('sin ids no consulta nada', async () => {
    expect(await fetchCartLines([], publicClient())).toEqual([]);
  });

  it('rechaza ids que no son uuid y más líneas que el tope', async () => {
    await expect(fetchCartLines(['1; drop table'], publicClient())).rejects.toThrow();
    const many = Array.from({ length: MAX_CART_LINES + 1 }, () => randomUUID());
    await expect(fetchCartLines(many, publicClient())).rejects.toThrow();
  });
});
