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
  sampleShippingAddress,
  serviceClient,
  type TestUser,
} from './helpers';

const idSchema = z.object({ id: z.string() });
const nameRowsSchema = z.array(z.object({ id: z.string(), name: z.string() }));
const priceRowsSchema = z.array(z.object({ id: z.string(), price_cents: z.number() }));
const qtyRowsSchema = z.array(z.object({ id: z.string(), qty: z.number() }));
const guideRowsSchema = z.array(z.object({ category: z.string(), content: z.unknown() }));

// Esta categoría se usa para la prueba de size_guides. Si ya tiene datos reales,
// los tests se niegan a ejecutarse para no pisarlos.
const GUIDE_CATEGORY = 'pantalones';

let admin: SupabaseClient;
let customerA: TestUser;
let customerB: TestUser;
let adminUser: TestUser;

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

let activeProductId: string;
let inactiveProductId: string;
let activeVariantId: string;
let inactiveVariantId: string;
let cartAId: string;
let cartItemAId: string;

function productBase(overrides: Record<string, unknown> = {}) {
  return {
    slug: `t003b-${randomUUID().slice(0, 8)}`,
    name: 'Polo de prueba',
    gender: 'hombre',
    category: 'polos',
    occasion: 'casual',
    ...overrides,
  };
}

async function insertProductAsService(overrides: Record<string, unknown> = {}): Promise<string> {
  const result = await admin.from('products').insert(productBase(overrides)).select('id').single();
  if (result.error) throw new Error(`insertProduct: ${result.error.message}`);
  const id = idSchema.parse(result.data).id;
  createdProductIds.push(id);
  return id;
}

async function insertVariantAsService(
  productId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const result = await admin
    .from('product_variants')
    .insert({ product_id: productId, size: 'M', color: 'azul', price_cents: 3990, stock: 5, ...overrides })
    .select('id')
    .single();
  if (result.error) throw new Error(`insertVariant: ${result.error.message}`);
  return idSchema.parse(result.data).id;
}

beforeAll(async () => {
  admin = serviceClient();

  const existingGuide = await admin.from('size_guides').select('category').eq('category', GUIDE_CATEGORY);
  if (existingGuide.error) throw new Error(`size_guides: ${existingGuide.error.message}`);
  if ((existingGuide.data ?? []).length > 0) {
    throw new Error(
      `Ya existe una guía de tallas real para "${GUIDE_CATEGORY}": los tests no la sobrescriben.`,
    );
  }

  customerA = await createTestUser(admin, 'cat-a');
  customerB = await createTestUser(admin, 'cat-b');
  adminUser = await createTestUser(admin, 'cat-admin');
  await promoteToAdmin(admin, adminUser.id);

  activeProductId = await insertProductAsService({ active: true });
  inactiveProductId = await insertProductAsService({ active: false });
  activeVariantId = await insertVariantAsService(activeProductId);
  inactiveVariantId = await insertVariantAsService(inactiveProductId);
});

afterAll(async () => {
  // Si beforeAll falló antes de crear el cliente, no hay nada que limpiar.
  if (!admin) return;
  if (createdOrderIds.length > 0) {
    await admin.from('orders').delete().in('id', createdOrderIds);
  }
  // La baja de productos elimina en cascada variantes, líneas de carrito y reservas.
  if (createdProductIds.length > 0) {
    await admin.from('products').delete().in('id', createdProductIds);
  }
  await admin.from('size_guides').delete().eq('category', GUIDE_CATEGORY);
  for (const user of [customerA, customerB, adminUser]) {
    if (user) await deleteTestUser(admin, user.id);
  }
});

describe('products: lectura pública', () => {
  it('un anónimo ve el producto activo', async () => {
    const result = await anonymousClient().from('products').select('id').eq('id', activeProductId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('un anónimo no ve el producto inactivo', async () => {
    const result = await anonymousClient().from('products').select('id').eq('id', inactiveProductId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('un anónimo ve las variantes del producto activo', async () => {
    const result = await anonymousClient().from('product_variants').select('id').eq('id', activeVariantId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('un anónimo no ve las variantes del producto inactivo', async () => {
    const result = await anonymousClient()
      .from('product_variants')
      .select('id')
      .eq('id', inactiveVariantId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('un cliente no admin tampoco ve el producto inactivo', async () => {
    const result = await customerA.client.from('products').select('id').eq('id', inactiveProductId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });
});

describe('products: un no admin no puede escribir (CA-15)', () => {
  it('un cliente no puede crear un producto', async () => {
    const slug = `t003b-intruso-${randomUUID().slice(0, 8)}`;
    const result = await customerA.client.from('products').insert(productBase({ slug }));
    expect(result.error).not.toBeNull();
    const check = await admin.from('products').select('id').eq('slug', slug);
    expect(idRowsSchema.parse(check.data)).toHaveLength(0);
  });

  it('un anónimo no puede crear un producto', async () => {
    const slug = `t003b-anon-${randomUUID().slice(0, 8)}`;
    const result = await anonymousClient().from('products').insert(productBase({ slug }));
    expect(result.error).not.toBeNull();
    const check = await admin.from('products').select('id').eq('slug', slug);
    expect(idRowsSchema.parse(check.data)).toHaveLength(0);
  });

  it('un cliente no puede modificar un producto', async () => {
    await customerA.client.from('products').update({ name: 'Hackeado' }).eq('id', activeProductId);
    const check = await admin.from('products').select('id, name').eq('id', activeProductId);
    expect(nameRowsSchema.parse(check.data)[0]?.name).toBe('Polo de prueba');
  });

  it('un cliente no puede borrar un producto', async () => {
    await customerA.client.from('products').delete().eq('id', activeProductId);
    const check = await admin.from('products').select('id').eq('id', activeProductId);
    expect(idRowsSchema.parse(check.data)).toHaveLength(1);
  });

  it('un cliente no puede crear una variante', async () => {
    const result = await customerA.client.from('product_variants').insert({
      product_id: activeProductId,
      size: 'XL',
      color: 'rojo',
      price_cents: 1,
      stock: 99,
    });
    expect(result.error).not.toBeNull();
  });

  it('un cliente no puede cambiar el precio de una variante', async () => {
    await customerA.client.from('product_variants').update({ price_cents: 1 }).eq('id', activeVariantId);
    const check = await admin.from('product_variants').select('id, price_cents').eq('id', activeVariantId);
    expect(priceRowsSchema.parse(check.data)[0]?.price_cents).toBe(3990);
  });

  it('un cliente no puede borrar una variante', async () => {
    await customerA.client.from('product_variants').delete().eq('id', activeVariantId);
    const check = await admin.from('product_variants').select('id').eq('id', activeVariantId);
    expect(idRowsSchema.parse(check.data)).toHaveLength(1);
  });
});

describe('products: el admin gestiona el catálogo', () => {
  it('el admin ve también los productos inactivos', async () => {
    const result = await adminUser.client.from('products').select('id').eq('id', inactiveProductId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('el admin crea un producto con variantes, lo edita y lo borra', async () => {
    const slug = `t003b-admin-${randomUUID().slice(0, 8)}`;
    const created = await adminUser.client
      .from('products')
      .insert(productBase({ slug, occasion: 'vestir', is_new: true, composition: '100% algodón' }))
      .select('id')
      .single();
    expect(created.error).toBeNull();
    const productId = idSchema.parse(created.data).id;
    createdProductIds.push(productId);

    const variant = await adminUser.client
      .from('product_variants')
      .insert({ product_id: productId, size: 'L', color: 'blanco', price_cents: 5490, stock: 3 })
      .select('id')
      .single();
    expect(variant.error).toBeNull();

    const updated = await adminUser.client.from('products').update({ name: 'Camisa editada' }).eq('id', productId);
    expect(updated.error).toBeNull();
    const check = await admin.from('products').select('id, name').eq('id', productId);
    expect(nameRowsSchema.parse(check.data)[0]?.name).toBe('Camisa editada');

    const removed = await adminUser.client.from('products').delete().eq('id', productId);
    expect(removed.error).toBeNull();
    const gone = await admin.from('products').select('id').eq('id', productId);
    expect(idRowsSchema.parse(gone.data)).toHaveLength(0);
  });
});

describe('restricciones de datos del catálogo (independientes de RLS)', () => {
  it('rechaza una ocasión no permitida', async () => {
    const result = await admin.from('products').insert(productBase({ occasion: 'playa' }));
    expect(result.error).not.toBeNull();
  });

  it('rechaza un género no permitido', async () => {
    const result = await admin.from('products').insert(productBase({ gender: 'otro' }));
    expect(result.error).not.toBeNull();
  });

  it('rechaza una categoría no permitida', async () => {
    const result = await admin.from('products').insert(productBase({ category: 'sombreros' }));
    expect(result.error).not.toBeNull();
  });

  it('rechaza un slug con formato inválido', async () => {
    const result = await admin.from('products').insert(productBase({ slug: 'Slug Malo' }));
    expect(result.error).not.toBeNull();
  });

  it('rechaza una altura de modelo fuera de rango', async () => {
    const result = await admin.from('products').insert(productBase({ model_height_cm: 20 }));
    expect(result.error).not.toBeNull();
  });

  it('rechaza un precio negativo', async () => {
    const result = await admin
      .from('product_variants')
      .insert({ product_id: activeProductId, size: 'S', color: 'negro', price_cents: -1, stock: 1 });
    expect(result.error).not.toBeNull();
  });

  it('rechaza un precio con decimales (céntimos enteros)', async () => {
    const result = await admin
      .from('product_variants')
      .insert({ product_id: activeProductId, size: 'S', color: 'gris', price_cents: 10.5, stock: 1 });
    expect(result.error).not.toBeNull();
  });

  it('rechaza un stock negativo', async () => {
    const result = await admin
      .from('product_variants')
      .insert({ product_id: activeProductId, size: 'S', color: 'verde', price_cents: 100, stock: -1 });
    expect(result.error).not.toBeNull();
  });

  it('rechaza una variante duplicada (producto, talla y color)', async () => {
    const result = await admin
      .from('product_variants')
      .insert({ product_id: activeProductId, size: 'M', color: 'azul', price_cents: 100, stock: 1 });
    expect(result.error).not.toBeNull();
  });
});

describe('size_guides: lectura pública y escritura solo admin', () => {
  it('el servicio crea una guía y un anónimo puede leerla', async () => {
    const created = await admin
      .from('size_guides')
      .insert({ category: GUIDE_CATEGORY, content: { sizes: ['38', '40'] } });
    expect(created.error).toBeNull();

    const result = await anonymousClient().from('size_guides').select('category, content').eq('category', GUIDE_CATEGORY);
    expect(result.error).toBeNull();
    expect(guideRowsSchema.parse(result.data)).toHaveLength(1);
  });

  it('un cliente no puede modificar la guía', async () => {
    await customerA.client
      .from('size_guides')
      .update({ content: { sizes: ['hackeado'] } })
      .eq('category', GUIDE_CATEGORY);
    const check = await admin.from('size_guides').select('category, content').eq('category', GUIDE_CATEGORY);
    expect(JSON.stringify(guideRowsSchema.parse(check.data)[0]?.content)).toBe(
      JSON.stringify({ sizes: ['38', '40'] }),
    );
  });

  it('un cliente no puede crear ni borrar guías', async () => {
    const insert = await customerA.client
      .from('size_guides')
      .insert({ category: 'polos', content: { sizes: ['x'] } });
    expect(insert.error).not.toBeNull();
    await customerA.client.from('size_guides').delete().eq('category', GUIDE_CATEGORY);
    const check = await admin.from('size_guides').select('category').eq('category', GUIDE_CATEGORY);
    expect(z.array(z.object({ category: z.string() })).parse(check.data)).toHaveLength(1);
  });

  it('el admin puede editar la guía', async () => {
    const result = await adminUser.client
      .from('size_guides')
      .update({ content: { sizes: ['38', '40', '42'] } })
      .eq('category', GUIDE_CATEGORY);
    expect(result.error).toBeNull();
    const check = await admin.from('size_guides').select('category, content').eq('category', GUIDE_CATEGORY);
    expect(JSON.stringify(guideRowsSchema.parse(check.data)[0]?.content)).toBe(
      JSON.stringify({ sizes: ['38', '40', '42'] }),
    );
  });
});

describe('carts: aislamiento entre usuarios', () => {
  it('A crea su carrito y añade una línea', async () => {
    const cart = await customerA.client.from('carts').insert({ user_id: customerA.id }).select('id').single();
    expect(cart.error).toBeNull();
    cartAId = idSchema.parse(cart.data).id;

    const item = await customerA.client
      .from('cart_items')
      .insert({ cart_id: cartAId, variant_id: activeVariantId, qty: 2 })
      .select('id')
      .single();
    expect(item.error).toBeNull();
    cartItemAId = idSchema.parse(item.data).id;
  });

  it('B no ve el carrito de A', async () => {
    const result = await customerB.client.from('carts').select('id').eq('id', cartAId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('B no ve las líneas del carrito de A', async () => {
    const result = await customerB.client.from('cart_items').select('id').eq('cart_id', cartAId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('B no puede añadir líneas al carrito de A', async () => {
    const result = await customerB.client
      .from('cart_items')
      .insert({ cart_id: cartAId, variant_id: inactiveVariantId, qty: 1 });
    expect(result.error).not.toBeNull();
  });

  it('B no puede crear un carrito a nombre de A', async () => {
    const result = await customerB.client.from('carts').insert({ user_id: customerA.id });
    expect(result.error).not.toBeNull();
  });

  it('B no puede modificar ni borrar las líneas de A', async () => {
    await customerB.client.from('cart_items').update({ qty: 50 }).eq('id', cartItemAId);
    await customerB.client.from('cart_items').delete().eq('id', cartItemAId);
    const check = await admin.from('cart_items').select('id, qty').eq('id', cartItemAId);
    const rows = qtyRowsSchema.parse(check.data);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.qty).toBe(2);
  });

  it('A puede cambiar la cantidad de su línea', async () => {
    const result = await customerA.client.from('cart_items').update({ qty: 3 }).eq('id', cartItemAId);
    expect(result.error).toBeNull();
    const check = await admin.from('cart_items').select('id, qty').eq('id', cartItemAId);
    expect(qtyRowsSchema.parse(check.data)[0]?.qty).toBe(3);
  });

  it('rechaza cantidades fuera de rango (0 y 100)', async () => {
    const zero = await customerA.client.from('cart_items').update({ qty: 0 }).eq('id', cartItemAId);
    const hundred = await customerA.client.from('cart_items').update({ qty: 100 }).eq('id', cartItemAId);
    expect(zero.error).not.toBeNull();
    expect(hundred.error).not.toBeNull();
  });

  it('un anónimo no obtiene carritos ni líneas', async () => {
    const carts = await anonymousClient().from('carts').select('id');
    const items = await anonymousClient().from('cart_items').select('id');
    expect(carts.error ? [] : idRowsSchema.parse(carts.data)).toHaveLength(0);
    expect(items.error ? [] : idRowsSchema.parse(items.data)).toHaveLength(0);
  });
});

describe('stock_reservations: solo servidor y admin', () => {
  let reservationId: string;

  it('el servicio crea una reserva', async () => {
    const order = await admin
      .from('orders')
      .insert({
        user_id: customerA.id,
        total_cents: 3990,
        shipping_cents: 495,
        shipping_address: sampleShippingAddress,
      })
      .select('id')
      .single();
    expect(order.error).toBeNull();
    const orderId = idSchema.parse(order.data).id;
    createdOrderIds.push(orderId);

    const reservation = await admin
      .from('stock_reservations')
      .insert({
        order_id: orderId,
        variant_id: activeVariantId,
        qty: 1,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    expect(reservation.error).toBeNull();
    reservationId = idSchema.parse(reservation.data).id;
  });

  it('un cliente no ve las reservas, ni siquiera las de su pedido', async () => {
    const result = await customerA.client.from('stock_reservations').select('id');
    const rows = result.error ? [] : idRowsSchema.parse(result.data);
    expect(rows.map((row) => row.id)).not.toContain(reservationId);
  });

  it('un cliente no puede insertar, modificar ni borrar reservas', async () => {
    const insert = await customerA.client.from('stock_reservations').insert({
      order_id: createdOrderIds[0],
      variant_id: activeVariantId,
      qty: 1,
      expires_at: new Date().toISOString(),
    });
    expect(insert.error).not.toBeNull();
    await customerA.client.from('stock_reservations').update({ status: 'liberada' }).eq('id', reservationId);
    await customerA.client.from('stock_reservations').delete().eq('id', reservationId);
    const check = await admin.from('stock_reservations').select('id, status').eq('id', reservationId);
    const rows = z.array(z.object({ id: z.string(), status: z.string() })).parse(check.data);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('activa');
  });

  it('un anónimo no obtiene reservas', async () => {
    const result = await anonymousClient().from('stock_reservations').select('id');
    expect(result.error ? [] : idRowsSchema.parse(result.data)).toHaveLength(0);
  });

  it('el admin sí puede leer las reservas', async () => {
    const result = await adminUser.client.from('stock_reservations').select('id').eq('id', reservationId);
    expect(result.error).toBeNull();
    expect(idRowsSchema.parse(result.data)).toHaveLength(1);
  });
});
