import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serviceClient } from './helpers';

// CA-79 (T-044): el CHECK de products.category acepta las once categorías y rechaza cualquier otra.
// Requiere la migración 20261020000000_nine_categories.sql aplicada en Supabase.

const CATEGORIES = ['polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'abrigos', 'jerseis', 'faldas', 'tops'];
const created: string[] = [];

let admin: SupabaseClient;

beforeAll(() => {
  admin = serviceClient();
});

afterAll(async () => {
  if (created.length > 0) await admin.from('products').delete().in('slug', created);
});

function insert(category: string) {
  const slug = `t044-${category}-${randomUUID().slice(0, 6)}`;
  created.push(slug);
  return admin
    .from('products')
    .insert({ slug, name: `Producto ${category}`, gender: 'mujer', category, occasion: 'casual', active: false });
}

describe('products.category (CA-79)', () => {
  it.each(CATEGORIES)('acepta %s', async (category) => {
    const result = await insert(category);
    expect(result.error).toBeNull();
  });

  it.each(['bufandas', 'Polos', '', 'camiseta'])('rechaza %j', async (category) => {
    const result = await insert(category);
    expect(result.error).not.toBeNull();
  });
});

describe('size_guides.category (CA-79)', () => {
  it('rechaza una categoría que no está entre las once', async () => {
    const result = await admin.from('size_guides').insert({ category: 'bufandas', content: {} });
    expect(result.error).not.toBeNull();
  });
});
