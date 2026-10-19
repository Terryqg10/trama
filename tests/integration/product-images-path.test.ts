import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { serviceClient } from './helpers';

// CA-67 (T-036): el CHECK de product_images.path admite /products/ e /images/products/ y nada más.
// Requiere la migración 20261019000000_product_images_path_images_dir.sql aplicada en Supabase.

const idSchema = z.object({ id: z.string() });

let admin: SupabaseClient;
let productId: string;

beforeAll(async () => {
  admin = serviceClient();
  const created = await admin
    .from('products')
    .insert({
      slug: `t036-path-${randomUUID().slice(0, 8)}`,
      name: 'Producto de rutas de imagen',
      gender: 'hombre',
      category: 'camisas',
      occasion: 'casual',
      active: false,
    })
    .select('id')
    .single();
  if (created.error) throw new Error(`beforeAll: ${created.error.message}`);
  productId = idSchema.parse(created.data).id;
});

afterAll(async () => {
  if (productId) await admin.from('products').delete().eq('id', productId);
});

let position = 0;
const insert = (path: string) =>
  admin.from('product_images').insert({ product_id: productId, path, alt: 'Texto alternativo', position: position++ });

describe('product_images.path (CA-67)', () => {
  it.each([
    '/images/products/camisa-oxford-blanca.avif',
    '/images/products/polo-pique-azul-marino.webp',
    '/products/blusas-azul.svg',
  ])('acepta %s', async (path) => {
    const result = await insert(path);
    expect(result.error).toBeNull();
  });

  it.each([
    'https://evil.example/x.avif',
    '/images/products/../secreto.avif',
    '/images/hero/hero-pareja-vertical.avif',
    '/images/products/script.js',
    '/images/products/Camisa.avif',
    '/images/products/sub/camisa.avif',
    '/otra/ruta.avif',
  ])('rechaza %s', async (path) => {
    const result = await insert(path);
    expect(result.error).not.toBeNull();
  });
});
