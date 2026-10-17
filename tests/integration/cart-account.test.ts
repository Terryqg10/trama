import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadAccountCart, mergeGuestIntoAccount, saveAccountCart } from '../../src/lib/cart/account';
import type { Database } from '../../src/lib/db/types.generated';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  idRowsSchema,
  serviceClient,
  type TestUser,
} from './helpers';

// T-031: carrito de la cuenta (CA-04 fusión, CA-63 persistencia, tope por stock y aislamiento RLS).

type Client = SupabaseClient<Database>;

const idSchema = z.object({ id: z.string() });
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

let admin: SupabaseClient;
let userA: TestUser;
let userB: TestUser;
let productId = '';
let v1 = ''; // stock 3
let v2 = ''; // stock 5

const asClient = (user: TestUser): Client => user.client;

async function createVariant(size: string, stock: number): Promise<string> {
  const inserted = await admin
    .from('product_variants')
    .insert({ product_id: productId, size, color: TAG, price_cents: 1500, stock })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createVariant: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

async function storedLines(userId: string): Promise<Array<{ variant_id: string; qty: number }>> {
  const cart = await admin.from('carts').select('id').eq('user_id', userId).maybeSingle();
  if (!cart.data) return [];
  const items = await admin
    .from('cart_items')
    .select('variant_id, qty')
    .eq('cart_id', idSchema.parse(cart.data).id)
    .order('variant_id');
  return z.array(z.object({ variant_id: z.string(), qty: z.number() })).parse(items.data);
}

beforeAll(async () => {
  admin = serviceClient();
  const product = await admin
    .from('products')
    .insert({
      slug: `t031-${randomUUID().slice(0, 8)}`,
      name: 'Producto T-031',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    })
    .select('id')
    .single();
  if (product.error) throw new Error(`createProduct: ${product.error.message}`);
  productId = idSchema.parse(product.data).id;
  v1 = await createVariant('S', 3);
  v2 = await createVariant('M', 5);
  userA = await createTestUser(admin, 'cart-a');
  userB = await createTestUser(admin, 'cart-b');
});

afterAll(async () => {
  if (!admin) return;
  if (userA) await deleteTestUser(admin, userA.id);
  if (userB) await deleteTestUser(admin, userB.id);
  if (productId) await admin.from('products').delete().eq('id', productId);
});

describe('fusión al iniciar sesión (CA-04, test cart-merge)', () => {
  it('suma las líneas del invitado a las de la cuenta sin perder ninguna', async () => {
    await saveAccountCart(asClient(userA), userA.id, [{ variantId: v1, qty: 1 }]);

    const merged = await mergeGuestIntoAccount(asClient(userA), userA.id, [
      { variantId: v1, qty: 1 },
      { variantId: v2, qty: 2 },
    ]);

    expect(merged).toEqual(
      expect.arrayContaining([
        { variantId: v1, qty: 2 },
        { variantId: v2, qty: 2 },
      ]),
    );
    expect(merged).toHaveLength(2);
    expect(await storedLines(userA.id)).toEqual(
      expect.arrayContaining([
        { variant_id: v1, qty: 2 },
        { variant_id: v2, qty: 2 },
      ]),
    );
  });

  it('limita la cantidad al stock al fusionar y descarta variantes inexistentes', async () => {
    const merged = await mergeGuestIntoAccount(asClient(userA), userA.id, [
      { variantId: v1, qty: 99 },
      { variantId: randomUUID(), qty: 1 },
    ]);
    expect(merged.find((line) => line.variantId === v1)?.qty).toBe(3);
    expect(merged).toHaveLength(2);
  });
});

describe('carrito de la cuenta (CA-63, test cart-account)', () => {
  it('lo guardado se lee de la BD y los cambios y quitar persisten', async () => {
    await saveAccountCart(asClient(userA), userA.id, [
      { variantId: v1, qty: 1 },
      { variantId: v2, qty: 4 },
    ]);
    expect(await loadAccountCart(asClient(userA))).toEqual(
      expect.arrayContaining([
        { variantId: v1, qty: 1 },
        { variantId: v2, qty: 4 },
      ]),
    );

    await saveAccountCart(asClient(userA), userA.id, [{ variantId: v2, qty: 9 }]);
    // Se recorta al stock (5) y la línea quitada desaparece.
    expect(await storedLines(userA.id)).toEqual([{ variant_id: v2, qty: 5 }]);
  });

  it('vaciar el carrito borra todas las líneas', async () => {
    await saveAccountCart(asClient(userA), userA.id, []);
    expect(await storedLines(userA.id)).toEqual([]);
  });
});

describe('aislamiento entre usuarios (RLS de carts y cart_items)', () => {
  it('B no ve el carrito de A y sus operaciones no lo tocan', async () => {
    await saveAccountCart(asClient(userA), userA.id, [{ variantId: v1, qty: 2 }]);

    expect(await loadAccountCart(asClient(userB))).toEqual([]);

    await saveAccountCart(asClient(userB), userB.id, [{ variantId: v2, qty: 1 }]);
    expect(await storedLines(userA.id)).toEqual([{ variant_id: v1, qty: 2 }]);
    expect(await storedLines(userB.id)).toEqual([{ variant_id: v2, qty: 1 }]);
  });

  it('B no puede escribir en el carrito de A ni leer sus filas directamente', async () => {
    const cartA = await admin.from('carts').select('id').eq('user_id', userA.id).single();
    const cartAId = idSchema.parse(cartA.data).id;

    const read = await userB.client.from('cart_items').select('id').eq('cart_id', cartAId);
    expect(read.error).toBeNull();
    expect(idRowsSchema.parse(read.data)).toEqual([]);

    const write = await userB.client.from('cart_items').insert({ cart_id: cartAId, variant_id: v2, qty: 1 });
    expect(write.error).not.toBeNull();

    const hijack = await userB.client.from('carts').update({ user_id: userB.id }).eq('id', cartAId).select('id');
    expect(idRowsSchema.parse(hijack.data ?? [])).toEqual([]);
    expect(await storedLines(userA.id)).toEqual([{ variant_id: v1, qty: 2 }]);
  });

  it('un cliente anónimo no puede leer ningún carrito', async () => {
    const read = await anonymousClient().from('cart_items').select('id');
    expect(read.error !== null || (read.data ?? []).length === 0).toBe(true);
  });
});
