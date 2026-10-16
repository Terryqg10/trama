import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  idRowsSchema,
  promoteToAdmin,
  serviceClient,
  type TestUser,
} from './helpers';

const idSchema = z.object({ id: z.string() });
const altRowsSchema = z.array(z.object({ id: z.string(), alt: z.string() }));

let admin: SupabaseClient;
let customer: TestUser;
let adminUser: TestUser;

const createdProductIds: string[] = [];
let activeProductId: string;
let inactiveProductId: string;
let activeImageId: string;
let inactiveImageId: string;

async function createProduct(active: boolean): Promise<string> {
  const result = await admin
    .from('products')
    .insert({
      slug: `t005a-img-${randomUUID().slice(0, 8)}`,
      name: 'Producto de imágenes',
      gender: 'mujer',
      category: 'blusas',
      occasion: 'casual',
      active,
    })
    .select('id')
    .single();
  if (result.error) throw new Error(`createProduct: ${result.error.message}`);
  const id = idSchema.parse(result.data).id;
  createdProductIds.push(id);
  return id;
}

async function createImage(productId: string, position = 0): Promise<string> {
  const result = await admin
    .from('product_images')
    .insert({ product_id: productId, path: '/products/blusas-azul.svg', alt: 'Blusa azul', position })
    .select('id')
    .single();
  if (result.error) throw new Error(`createImage: ${result.error.message}`);
  return idSchema.parse(result.data).id;
}

beforeAll(async () => {
  admin = serviceClient();
  customer = await createTestUser(admin, 'img-a');
  adminUser = await createTestUser(admin, 'img-admin');
  await promoteToAdmin(admin, adminUser.id);

  activeProductId = await createProduct(true);
  inactiveProductId = await createProduct(false);
  activeImageId = await createImage(activeProductId);
  inactiveImageId = await createImage(inactiveProductId);
});

afterAll(async () => {
  // Si beforeAll falló antes de crear el cliente, no hay nada que limpiar.
  if (!admin) return;
  if (createdProductIds.length > 0) {
    await admin.from('products').delete().in('id', createdProductIds);
  }
  for (const user of [customer, adminUser]) {
    if (user) await deleteTestUser(admin, user.id);
  }
});

describe('product_images: lectura', () => {
  it('un anónimo ve las imágenes de un producto activo', async () => {
    const result = await anonymousClient().from('product_images').select('id').eq('id', activeImageId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('un anónimo no ve las imágenes de un producto inactivo', async () => {
    const result = await anonymousClient().from('product_images').select('id').eq('id', inactiveImageId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('un cliente no admin tampoco ve las del producto inactivo', async () => {
    const result = await customer.client.from('product_images').select('id').eq('id', inactiveImageId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('el admin ve las imágenes de un producto inactivo', async () => {
    const result = await adminUser.client.from('product_images').select('id').eq('id', inactiveImageId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });
});

describe('product_images: un no admin no puede escribir', () => {
  it('un cliente no puede crear imágenes', async () => {
    const result = await customer.client.from('product_images').insert({
      product_id: activeProductId,
      path: '/products/polos-azul.svg',
      alt: 'Intruso',
      position: 5,
    });
    expect(result.error).not.toBeNull();
  });

  it('un anónimo no puede crear imágenes', async () => {
    const result = await anonymousClient().from('product_images').insert({
      product_id: activeProductId,
      path: '/products/polos-azul.svg',
      alt: 'Intruso',
      position: 6,
    });
    expect(result.error).not.toBeNull();
  });

  it('un cliente no puede modificar el texto alternativo', async () => {
    await customer.client.from('product_images').update({ alt: 'Hackeado' }).eq('id', activeImageId);
    const check = await admin.from('product_images').select('id, alt').eq('id', activeImageId);
    expect(altRowsSchema.parse(check.data)[0]?.alt).toBe('Blusa azul');
  });

  it('un cliente no puede borrar imágenes', async () => {
    await customer.client.from('product_images').delete().eq('id', activeImageId);
    const check = await admin.from('product_images').select('id').eq('id', activeImageId);
    expect(idRowsSchema.parse(check.data)).toHaveLength(1);
  });
});

describe('product_images: el admin gestiona las imágenes', () => {
  it('el admin crea, edita y borra una imagen', async () => {
    const created = await adminUser.client
      .from('product_images')
      .insert({ product_id: activeProductId, path: '/products/blusas-negro.svg', alt: 'Blusa negra', position: 2 })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    const id = idSchema.parse(created.data).id;

    const updated = await adminUser.client.from('product_images').update({ alt: 'Blusa negra editada' }).eq('id', id);
    expect(updated.error).toBeNull();
    const check = await admin.from('product_images').select('id, alt').eq('id', id);
    expect(altRowsSchema.parse(check.data)[0]?.alt).toBe('Blusa negra editada');

    const removed = await adminUser.client.from('product_images').delete().eq('id', id);
    expect(removed.error).toBeNull();
    const gone = await admin.from('product_images').select('id').eq('id', id);
    expect(idRowsSchema.parse(gone.data)).toHaveLength(0);
  });
});

describe('product_images: restricciones de datos (independientes de RLS)', () => {
  const base = () => ({ product_id: activeProductId, alt: 'Texto', position: 9 });

  it('rechaza una URL externa', async () => {
    const result = await admin.from('product_images').insert({ ...base(), path: 'https://evil.example/x.svg' });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una ruta que sale de /products/', async () => {
    const result = await admin.from('product_images').insert({ ...base(), path: '/products/../secreto.svg' });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una extensión no permitida', async () => {
    const result = await admin.from('product_images').insert({ ...base(), path: '/products/script.js' });
    expect(result.error).not.toBeNull();
  });

  it('rechaza un texto alternativo vacío', async () => {
    const result = await admin
      .from('product_images')
      .insert({ ...base(), path: '/products/blusas-azul.svg', alt: '' });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una posición duplicada en el mismo producto', async () => {
    const result = await admin
      .from('product_images')
      .insert({ product_id: activeProductId, path: '/products/blusas-gris.svg', alt: 'Duplicada', position: 0 });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una posición negativa', async () => {
    const result = await admin
      .from('product_images')
      .insert({ ...base(), path: '/products/blusas-gris.svg', position: -1 });
    expect(result.error).not.toBeNull();
  });
});

describe('product_images: borrado en cascada', () => {
  it('al borrar el producto desaparecen sus imágenes', async () => {
    const productId = await createProduct(true);
    const imageId = await createImage(productId);
    await admin.from('products').delete().eq('id', productId);
    const check = await admin.from('product_images').select('id').eq('id', imageId);
    expect(idRowsSchema.parse(check.data)).toHaveLength(0);
  });
});
