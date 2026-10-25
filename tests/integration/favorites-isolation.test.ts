import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { addFavorite, isFavorite, listFavoriteProductIds, removeFavorite } from '../../src/lib/favorites/favorites';
import { anonymousClient, createTestUser, deleteTestUser, serviceClient, type TestUser } from './helpers';

// CA-75 (T-041): RLS de `favorites` y operaciones del módulo `src/lib/favorites`. Los dos clientes y los productos
// son de prueba y se borran al terminar; no se toca ningún dato real.

const idSchema = z.object({ id: z.string() });
const rowsSchema = z.array(z.object({ user_id: z.string(), product_id: z.string() }));

let admin: SupabaseClient;
let alice: TestUser;
let bob: TestUser;
let activeId = '';
let activeId2 = '';
let inactiveId = '';

async function createProduct(active: boolean): Promise<string> {
  const result = await admin
    .from('products')
    .insert({
      slug: `t041-${randomUUID().slice(0, 8)}`,
      name: 'Prenda de prueba T-041',
      gender: 'mujer',
      category: 'jerseis',
      occasion: 'casual',
      active,
    })
    .select('id')
    .single();
  if (result.error) throw new Error(`producto: ${result.error.message}`);
  return idSchema.parse(result.data).id;
}

beforeAll(async () => {
  admin = serviceClient();
  alice = await createTestUser(admin, 'fav-a');
  bob = await createTestUser(admin, 'fav-b');
  activeId = await createProduct(true);
  activeId2 = await createProduct(true);
  inactiveId = await createProduct(false);
});

afterAll(async () => {
  for (const id of [activeId, activeId2, inactiveId]) if (id) await admin.from('products').delete().eq('id', id);
  if (alice) await deleteTestUser(admin, alice.id);
  if (bob) await deleteTestUser(admin, bob.id);
});

describe('aislamiento entre clientes y visitante (CA-75)', () => {
  it('un cliente marca un favorito y solo él lo ve', async () => {
    expect(await addFavorite(alice.client, alice.id, activeId)).toBe('added');
    expect(await listFavoriteProductIds(alice.client)).toEqual([activeId]);
    expect(await listFavoriteProductIds(bob.client)).toEqual([]);
    expect(await isFavorite(bob.client, activeId)).toBe(false);
    const asBob = await bob.client.from('favorites').select('user_id, product_id').eq('user_id', alice.id);
    expect(asBob.error).toBeNull();
    expect(rowsSchema.parse(asBob.data)).toEqual([]);
  });

  it('un cliente no puede crear un favorito a nombre de otro', async () => {
    const result = await bob.client.from('favorites').insert({ user_id: alice.id, product_id: activeId2 });
    expect(result.error).not.toBeNull();
    const seen = await admin.from('favorites').select('user_id').eq('product_id', activeId2);
    expect(seen.data).toEqual([]);
  });

  it('un cliente no puede borrar los favoritos de otro', async () => {
    expect(await removeFavorite(bob.client, activeId)).toBe('not_favorite');
    expect(await isFavorite(alice.client, activeId)).toBe(true);
    const direct = await bob.client.from('favorites').delete().eq('user_id', alice.id).select('product_id');
    expect(direct.data ?? []).toEqual([]);
    expect(await isFavorite(alice.client, activeId)).toBe(true);
  });

  it('no existe la operación de actualizar: nadie puede mover un favorito a otro usuario o producto', async () => {
    const update = await alice.client.from('favorites').update({ user_id: bob.id }).eq('product_id', activeId).select('product_id');
    expect(update.error !== null || (update.data ?? []).length === 0).toBe(true);
    expect(await isFavorite(bob.client, activeId)).toBe(false);
  });

  it('un visitante sin sesión no lee, crea ni borra nada', async () => {
    const anon = anonymousClient();
    const read = await anon.from('favorites').select('product_id');
    expect(read.error !== null || (read.data ?? []).length === 0).toBe(true);
    const insert = await anon.from('favorites').insert({ user_id: alice.id, product_id: activeId2 });
    expect(insert.error).not.toBeNull();
    const del = await anon.from('favorites').delete().eq('product_id', activeId).select('product_id');
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
    expect(await isFavorite(alice.client, activeId)).toBe(true);
  });
});

describe('operaciones del módulo (CA-75)', () => {
  it('marcar dos veces no duplica; devuelve «already»', async () => {
    expect(await addFavorite(alice.client, alice.id, activeId)).toBe('already');
    expect(await listFavoriteProductIds(alice.client)).toEqual([activeId]);
  });

  it('un producto inexistente o inactivo no se puede marcar', async () => {
    expect(await addFavorite(alice.client, alice.id, randomUUID())).toBe('not_found');
    expect(await addFavorite(alice.client, alice.id, inactiveId)).toBe('not_found');
  });

  it('un id que no es UUID se rechaza antes de la BD', async () => {
    expect(await addFavorite(alice.client, alice.id, 'no-uuid')).toBe('invalid');
    expect(await removeFavorite(alice.client, 'no-uuid')).toBe('invalid');
    expect(await isFavorite(alice.client, 'no-uuid')).toBe(false);
  });

  it('lista del más reciente al más antiguo, y desmarcar funciona una vez', async () => {
    expect(await addFavorite(alice.client, alice.id, activeId2)).toBe('added');
    expect(await listFavoriteProductIds(alice.client)).toEqual([activeId2, activeId]);
    expect(await removeFavorite(alice.client, activeId)).toBe('removed');
    expect(await removeFavorite(alice.client, activeId)).toBe('not_favorite');
    expect(await listFavoriteProductIds(alice.client)).toEqual([activeId2]);
  });

  it('borrar el producto o el usuario borra sus favoritos en cascada', async () => {
    await admin.from('products').delete().eq('id', activeId2);
    expect(await listFavoriteProductIds(alice.client)).toEqual([]);
    expect(await addFavorite(bob.client, bob.id, activeId)).toBe('added');
    await deleteTestUser(admin, bob.id);
    const left = await admin.from('favorites').select('user_id').eq('user_id', bob.id);
    expect(left.data).toEqual([]);
    bob = await createTestUser(admin, 'fav-b2');
  });
});
