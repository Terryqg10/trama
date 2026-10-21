import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  publicClient,
  serviceClient,
  type TestUser,
} from './helpers';

// CA-118 (T-075): `product_variants.compare_at_cents` es opcional, siempre mayor que el precio, la lee cualquiera con el
// `select` público de variantes y solo la escribe un admin. Requiere la migración 20261021000000_compare_at_price.sql y el
// seed `catalog-discounts.sql` aplicados en Supabase.

const idSchema = z.object({ id: z.string() });
const compareRowsSchema = z.array(
  z.object({ id: z.string(), price_cents: z.number(), compare_at_cents: z.number().nullable() }),
);
const seedRowsSchema = z.array(
  z.object({ price_cents: z.number(), compare_at_cents: z.number().nullable(), products: z.object({ slug: z.string() }) }),
);

const SEED_DISCOUNTED = [
  'abrigo-pano-gris',
  'chaqueta-acolchada-negra',
  'abrigo-largo-camel',
  'jersey-punto-crema',
  'jersey-punto-marron',
];

let admin: SupabaseClient;
let customer: TestUser;
let productId: string;
let variantId: string;

beforeAll(async () => {
  admin = serviceClient();
  customer = await createTestUser(admin, 'compare-at');
  const product = await admin
    .from('products')
    .insert({
      slug: `t075-${randomUUID().slice(0, 8)}`,
      name: 'Prenda de prueba T-075',
      gender: 'mujer',
      category: 'jerseis',
      occasion: 'casual',
      active: true,
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`producto: ${product.error.message}`);
  productId = idSchema.parse(product.data).id;
  const variant = await admin
    .from('product_variants')
    .insert({ product_id: productId, size: 'M', color: 'azul', price_cents: 5000, compare_at_cents: 6500, stock: 3 })
    .select('id')
    .single();
  if (variant.error) throw new Error(`variante: ${variant.error.message}`);
  variantId = idSchema.parse(variant.data).id;
});

afterAll(async () => {
  if (productId) await admin.from('products').delete().eq('id', productId);
  if (customer) await deleteTestUser(admin, customer.id);
});

function insertVariant(overrides: Record<string, unknown>) {
  return admin.from('product_variants').insert({
    product_id: productId,
    size: `T${randomUUID().slice(0, 4)}`,
    color: 'rojo',
    price_cents: 5000,
    stock: 1,
    ...overrides,
  });
}

describe('CHECK del precio anterior (CA-118)', () => {
  it('acepta una variante sin precio anterior (null) y con uno mayor que el actual', async () => {
    expect((await insertVariant({ compare_at_cents: null })).error).toBeNull();
    expect((await insertVariant({ compare_at_cents: 5001 })).error).toBeNull();
  });

  it.each([5000, 4999, 0, -100])('rechaza un precio anterior igual o menor que el actual: %j', async (value) => {
    const result = await insertVariant({ compare_at_cents: value });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una actualización que deja el precio anterior por debajo del actual', async () => {
    const lowered = await admin.from('product_variants').update({ compare_at_cents: 4000 }).eq('id', variantId);
    expect(lowered.error).not.toBeNull();
    const raised = await admin.from('product_variants').update({ price_cents: 7000 }).eq('id', variantId);
    expect(raised.error).not.toBeNull();
    const cleared = await admin.from('product_variants').update({ compare_at_cents: null }).eq('id', variantId);
    expect(cleared.error).toBeNull();
    const restored = await admin.from('product_variants').update({ compare_at_cents: 6500 }).eq('id', variantId);
    expect(restored.error).toBeNull();
  });
});

describe('lectura y escritura según RLS (CA-118)', () => {
  it('un anónimo lee el precio anterior con el `select` público de variantes', async () => {
    const result = await publicClient()
      .from('product_variants')
      .select('id, price_cents, compare_at_cents')
      .eq('id', variantId);
    expect(result.error).toBeNull();
    expect(compareRowsSchema.parse(result.data)).toEqual([{ id: variantId, price_cents: 5000, compare_at_cents: 6500 }]);
  });

  it('un anónimo y un cliente sin rol de admin no pueden modificarlo', async () => {
    for (const client of [anonymousClient(), customer.client]) {
      const update = await client
        .from('product_variants')
        .update({ compare_at_cents: 9999 })
        .eq('id', variantId)
        .select('id');
      // O falla el permiso o la política no deja ninguna fila: en ambos casos no cambia nada.
      expect(update.error !== null || update.data?.length === 0).toBe(true);
      const insert = await client
        .from('product_variants')
        .insert({ product_id: productId, size: 'XL', color: 'verde', price_cents: 100, compare_at_cents: 200, stock: 1 });
      expect(insert.error).not.toBeNull();
    }
    const check = await admin.from('product_variants').select('id, price_cents, compare_at_cents').eq('id', variantId);
    expect(compareRowsSchema.parse(check.data)[0]?.compare_at_cents).toBe(6500);
  });

  it('una variante de un producto inactivo no es visible para un anónimo (RLS sin cambios)', async () => {
    const inactive = await admin.from('products').update({ active: false }).eq('id', productId);
    expect(inactive.error).toBeNull();
    const result = await publicClient().from('product_variants').select('id, compare_at_cents').eq('id', variantId);
    expect(result.data ?? []).toEqual([]);
    await admin.from('products').update({ active: true }).eq('id', productId);
  });
});

describe('seed de rebajas de ejemplo (CA-118)', () => {
  it('deja entre 3 y 6 prendas rebajadas y cada precio anterior es mayor que el actual', async () => {
    const result = await publicClient()
      .from('product_variants')
      .select('price_cents, compare_at_cents, products!inner(slug)')
      .not('compare_at_cents', 'is', null)
      .not('products.slug', 'like', 't075-%');
    expect(result.error).toBeNull();
    const rows = seedRowsSchema.parse(result.data);
    const slugs = new Set(rows.map((row) => row.products.slug));
    expect(slugs.size).toBeGreaterThanOrEqual(3);
    expect(slugs.size).toBeLessThanOrEqual(6);
    for (const slug of SEED_DISCOUNTED) expect(slugs.has(slug), slug).toBe(true);
    for (const row of rows) expect(row.compare_at_cents ?? 0).toBeGreaterThan(row.price_cents);
  });
});
