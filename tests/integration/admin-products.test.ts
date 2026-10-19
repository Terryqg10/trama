import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createProduct,
  createVariant,
  deleteVariant,
  getAdminProduct,
  listAdminProducts,
  setProductActive,
  updateProduct,
  updateVariant,
} from '../../src/lib/admin/products';
import { productSchema, variantSchema } from '../../src/lib/admin/product-schemas';
import { getProductBySlug, listProducts } from '../../src/lib/catalog/queries';
import type { Database } from '../../src/lib/db/types.generated';
import { createTestUser, deleteTestUser, promoteToAdmin, publicClient, serviceClient, type TestUser } from './helpers';

// T-021: productos, variantes y stock desde el panel (CA-15, CA-16) contra la BD real. El admin escribe con su
// sesión (la RLS lo permite); un cliente no admin recibe el rechazo de la RLS al llamar a las mismas funciones.

type Client = SupabaseClient<Database>;

let admin: SupabaseClient;
let adminUser: TestUser;
let customer: TestUser;
const productIds: string[] = [];
const TAG = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

const asClient = (user: TestUser): Client => user.client;

function productInput(slug: string, overrides: Record<string, string> = {}) {
  return productSchema.parse({
    name: `Producto ${slug}`,
    slug,
    description: 'Descripción de prueba',
    gender: 'hombre',
    category: 'polos',
    occasion: 'casual',
    composition: '100% algodón',
    care: '',
    modelHeightCm: '185',
    modelSize: 'M',
    ...overrides,
  });
}

const uniqueSlug = (label: string) => `t021-${label}-${randomUUID().slice(0, 6)}`;

beforeAll(async () => {
  admin = serviceClient();
  adminUser = await createTestUser(admin, 'productos-admin');
  await promoteToAdmin(admin, adminUser.id);
  customer = await createTestUser(admin, 'productos-cliente');
});

afterAll(async () => {
  if (!admin) return;
  if (productIds.length > 0) await admin.from('products').delete().in('id', productIds);
  if (adminUser) await deleteTestUser(admin, adminUser.id);
  if (customer) await deleteTestUser(admin, customer.id);
});

describe('admin-create-product (CA-16, a nivel de datos)', () => {
  it('el admin crea un producto con variantes y aparece en el catálogo y en su ficha', async () => {
    const slug = uniqueSlug('crear');
    const created = await createProduct(asClient(adminUser), productInput(slug, { isNew: 'on' }));
    expect(created.status).toBe('ok');
    if (created.status !== 'ok') return;
    productIds.push(created.value.id);

    const variant = variantSchema.parse({ size: 'm', color: TAG, price: '29,90', stock: '8' });
    expect(await createVariant(asClient(adminUser), created.value.id, variant)).toEqual({ status: 'ok', value: undefined });
    expect(
      await createVariant(
        asClient(adminUser),
        created.value.id,
        variantSchema.parse({ size: 'L', color: TAG, price: '31', stock: '0' }),
      ),
    ).toEqual({ status: 'ok', value: undefined });

    // Visible para el público (cliente anónimo): listado y ficha.
    const listed = await listProducts({ onlyNew: false, sort: 'novedades', color: TAG }, publicClient());
    expect(listed.map((product) => product.slug)).toContain(slug);
    const detail = await getProductBySlug(slug, publicClient());
    expect(detail).toMatchObject({ name: `Producto ${slug}`, isNew: true });
    expect(detail?.variants.map((v) => [v.size, v.priceCents, v.stock]).sort()).toEqual([
      ['L', 3100, 0],
      ['M', 2990, 8],
    ]);

    const admined = await getAdminProduct(asClient(adminUser), created.value.id);
    expect(admined?.product).toMatchObject({ slug, gender: 'hombre', active: true, modelHeightCm: 185, care: null });
    expect(admined?.variants).toHaveLength(2);
  });

  it('un slug repetido se informa como duplicado y no crea nada', async () => {
    const slug = uniqueSlug('duplicado');
    const first = await createProduct(asClient(adminUser), productInput(slug));
    if (first.status === 'ok') productIds.push(first.value.id);
    expect(await createProduct(asClient(adminUser), productInput(slug))).toEqual({ status: 'duplicate' });
  });

  it('una variante repetida (misma talla y color) se informa como duplicada', async () => {
    const created = await createProduct(asClient(adminUser), productInput(uniqueSlug('variante-dup')));
    if (created.status !== 'ok') throw new Error('no se creó el producto de prueba');
    productIds.push(created.value.id);
    const variant = variantSchema.parse({ size: 'S', color: TAG, price: '10', stock: '1' });
    expect((await createVariant(asClient(adminUser), created.value.id, variant)).status).toBe('ok');
    expect(await createVariant(asClient(adminUser), created.value.id, variant)).toEqual({ status: 'duplicate' });
  });
});

describe('edición, stock y baja', () => {
  it('el admin edita el producto, ajusta precio y stock de una variante y la borra', async () => {
    const slug = uniqueSlug('editar');
    const created = await createProduct(asClient(adminUser), productInput(slug));
    if (created.status !== 'ok') throw new Error('no se creó el producto de prueba');
    productIds.push(created.value.id);
    await createVariant(asClient(adminUser), created.value.id, variantSchema.parse({ size: 'M', color: TAG, price: '20', stock: '5' }));
    const before = await getAdminProduct(asClient(adminUser), created.value.id);
    const variantId = before?.variants[0]?.id ?? '';

    expect(
      await updateProduct(asClient(adminUser), created.value.id, productInput(slug, { name: 'Nombre nuevo', category: 'camisas', occasion: 'vestir' })),
    ).toEqual({ status: 'ok', value: undefined });
    expect(await updateVariant(asClient(adminUser), variantId, { price: 2550, stock: 12 })).toEqual({ status: 'ok', value: undefined });

    const after = await getAdminProduct(asClient(adminUser), created.value.id);
    expect(after?.product).toMatchObject({ name: 'Nombre nuevo', category: 'camisas', occasion: 'vestir' });
    expect(after?.variants[0]).toMatchObject({ priceCents: 2550, stock: 12 });

    expect(await deleteVariant(asClient(adminUser), variantId)).toEqual({ status: 'ok', value: undefined });
    expect((await getAdminProduct(asClient(adminUser), created.value.id))?.variants).toEqual([]);
    expect(await deleteVariant(asClient(adminUser), variantId)).toEqual({ status: 'notFound' });
  });

  it('desactivar un producto lo quita del catálogo público y reactivarlo lo devuelve', async () => {
    const slug = uniqueSlug('baja');
    const created = await createProduct(asClient(adminUser), productInput(slug));
    if (created.status !== 'ok') throw new Error('no se creó el producto de prueba');
    productIds.push(created.value.id);
    await createVariant(asClient(adminUser), created.value.id, variantSchema.parse({ size: 'M', color: TAG, price: '20', stock: '5' }));
    expect(await getProductBySlug(slug, publicClient())).not.toBeNull();

    expect(await setProductActive(asClient(adminUser), created.value.id, false)).toEqual({ status: 'ok', value: undefined });
    expect(await getProductBySlug(slug, publicClient())).toBeNull();
    // El admin sigue viéndolo en el panel.
    expect((await getAdminProduct(asClient(adminUser), created.value.id))?.product.active).toBe(false);
    expect((await listAdminProducts(asClient(adminUser))).some((product) => product.slug === slug)).toBe(true);

    expect(await setProductActive(asClient(adminUser), created.value.id, true)).toEqual({ status: 'ok', value: undefined });
    expect(await getProductBySlug(slug, publicClient())).not.toBeNull();
  });

  it('un producto inexistente devuelve notFound', async () => {
    expect(await setProductActive(asClient(adminUser), randomUUID(), false)).toEqual({ status: 'notFound' });
    expect(await updateProduct(asClient(adminUser), randomUUID(), productInput(uniqueSlug('x')))).toEqual({ status: 'notFound' });
    expect(await getAdminProduct(asClient(adminUser), 'no-uuid')).toBeNull();
  });
});

describe('products-write-nonadmin (CA-15)', () => {
  it('un cliente no admin no puede crear un producto ni una variante por la API', async () => {
    const slug = uniqueSlug('ajeno');
    const created = await createProduct(asClient(customer), productInput(slug));
    expect(created.status).not.toBe('ok');
    const exists = await admin.from('products').select('id').eq('slug', slug);
    expect(exists.data).toEqual([]);

    // Sobre un producto existente tampoco puede añadir variantes, editarlo, desactivarlo ni borrar variantes.
    const real = await createProduct(asClient(adminUser), productInput(uniqueSlug('real')));
    if (real.status !== 'ok') throw new Error('no se creó el producto de prueba');
    productIds.push(real.value.id);
    await createVariant(asClient(adminUser), real.value.id, variantSchema.parse({ size: 'M', color: TAG, price: '20', stock: '5' }));
    const variantId = (await getAdminProduct(asClient(adminUser), real.value.id))?.variants[0]?.id ?? '';

    expect((await createVariant(asClient(customer), real.value.id, variantSchema.parse({ size: 'L', color: TAG, price: '1', stock: '1' }))).status).not.toBe('ok');
    expect((await updateProduct(asClient(customer), real.value.id, productInput(uniqueSlug('hack'), { name: 'Hackeado' }))).status).not.toBe('ok');
    expect((await setProductActive(asClient(customer), real.value.id, false)).status).not.toBe('ok');
    expect((await updateVariant(asClient(customer), variantId, { price: 1, stock: 999 })).status).not.toBe('ok');
    expect((await deleteVariant(asClient(customer), variantId)).status).not.toBe('ok');

    const intact = await getAdminProduct(asClient(adminUser), real.value.id);
    expect(intact?.product.active).toBe(true);
    expect(intact?.variants).toHaveLength(1);
    expect(intact?.variants[0]).toMatchObject({ priceCents: 2000, stock: 5 });
  });

  it('un cliente anónimo tampoco puede escribir', async () => {
    const anon = publicClient();
    const result = await anon.from('products').insert({
      slug: uniqueSlug('anon'),
      name: 'Anónimo',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    });
    expect(result.error).not.toBeNull();
  });
});
