import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonymousClient,
  createTestUser,
  deleteTestUser,
  promoteToAdmin,
  sampleAddress,
  serviceClient,
  type TestUser,
} from './helpers';

// CA-134 (T-092, Enmienda 41): welcome_coupons solo la toca el servidor, y un cupón no puede estar en dos pedidos no
// cancelados. Requiere la migración 20261023000000_welcome_coupons.sql aplicada en Supabase.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = (): string => {
  const pick = (): string =>
    Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? 'A').join('');
  return `TRAMA-${pick()}-${pick()}`;
};

const couponIds: string[] = [];
const emails: string[] = [];
const orderIds: string[] = [];
let admin: SupabaseClient;
let anon: SupabaseClient;
let customer: TestUser;
let other: TestUser;
let adminUser: TestUser;

const newEmail = (): string => {
  const email = `t092-${randomUUID().slice(0, 8)}@example.com`;
  emails.push(email);
  return email;
};

async function insertCoupon(overrides: Record<string, unknown> = {}): Promise<{ id: string; code: string; email: string }> {
  const row = { code: newCode(), email: newEmail(), ...overrides };
  const inserted = await admin.from('welcome_coupons').insert(row).select('id, code, email').single();
  if (inserted.error) throw new Error(`insertCoupon: ${inserted.error.message}`);
  const coupon = inserted.data as { id: string; code: string; email: string };
  couponIds.push(coupon.id);
  return coupon;
}

async function insertOrder(userId: string, couponId: string | null): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({
      user_id: userId,
      total_cents: 2690,
      shipping_cents: 0,
      discount_cents: couponId ? 299 : 0,
      coupon_id: couponId,
      shipping_address: sampleAddress,
    })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`insertOrder: ${inserted.error.message}`);
  const id = (inserted.data as { id: string }).id;
  orderIds.push(id);
  return id;
}

beforeAll(async () => {
  admin = serviceClient();
  anon = anonymousClient();
  customer = await createTestUser(admin, 't092-cliente');
  other = await createTestUser(admin, 't092-otro');
  adminUser = await createTestUser(admin, 't092-admin');
  await promoteToAdmin(admin, adminUser.id);
});

afterAll(async () => {
  if (orderIds.length > 0) await admin.from('orders').delete().in('id', orderIds);
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
  if (emails.length > 0) await admin.from('welcome_coupons').delete().in('email', emails);
  await deleteTestUser(admin, customer.id);
  await deleteTestUser(admin, other.id);
  await deleteTestUser(admin, adminUser.id);
});

describe('welcome_coupons: solo la clave de servicio (CA-134)', () => {
  let coupon: { id: string; code: string; email: string };

  beforeAll(async () => {
    coupon = await insertCoupon();
  });

  it('la clave de servicio crea el cupón con los valores por defecto: 10 %, 30 días y sin canjear', async () => {
    const stored = await admin
      .from('welcome_coupons')
      .select('percent_off, created_at, expires_at, redeemed_at, redeemed_order_id')
      .eq('id', coupon.id)
      .single();
    const row = stored.data as { percent_off: number; created_at: string; expires_at: string; redeemed_at: string | null; redeemed_order_id: string | null };
    expect(row.percent_off).toBe(10);
    expect(row.redeemed_at).toBeNull();
    expect(row.redeemed_order_id).toBeNull();
    const days = (Date.parse(row.expires_at) - Date.parse(row.created_at)) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  const who: [string, () => SupabaseClient][] = [
    ['un visitante', () => anon],
    ['un cliente con sesión', () => customer.client],
    ['un admin', () => adminUser.client],
  ];

  describe.each(who)('%s', (_name, client) => {
    it('no puede insertar', async () => {
      const { error } = await client().from('welcome_coupons').insert({ code: newCode(), email: newEmail() });
      expect(error).not.toBeNull();
    });

    it('no puede leer la lista ni una fila concreta', async () => {
      const all = await client().from('welcome_coupons').select('code, email');
      expect(all.data ?? []).toEqual([]);
      const one = await client().from('welcome_coupons').select('code').eq('email', coupon.email);
      expect(one.data ?? []).toEqual([]);
    });

    it('no puede cambiar ni borrar: la fila sigue igual', async () => {
      await client().from('welcome_coupons').update({ percent_off: 100, redeemed_at: new Date().toISOString() }).eq('id', coupon.id);
      await client().from('welcome_coupons').delete().eq('id', coupon.id);
      const stored = await admin.from('welcome_coupons').select('code, percent_off, redeemed_at').eq('id', coupon.id).single();
      expect(stored.data).toEqual({ code: coupon.code, percent_off: 10, redeemed_at: null });
    });
  });
});

describe('welcome_coupons: restricciones de la tabla (CA-134)', () => {
  it('rechaza un código repetido (23505)', async () => {
    const first = await insertCoupon();
    const second = await admin.from('welcome_coupons').insert({ code: first.code, email: newEmail() });
    expect(second.error?.code).toBe('23505');
  });

  it('rechaza un email repetido: un código por email (23505)', async () => {
    const first = await insertCoupon();
    const second = await admin.from('welcome_coupons').insert({ code: newCode(), email: first.email });
    expect(second.error?.code).toBe('23505');
  });

  it.each(['trama-ABCD-EFGH', 'TRAMA-ABCD-EFG', 'TRAMA-ABCD-EFGHJ', 'TRAMA-ABCD-EFG0', 'TRAMA-ABCD-EFGO', 'TRAMA-ABCD-EFG1', 'TRAMA-ABCD-EFGI', 'TRAMA-ABCD-EFGL', 'XXXXX-ABCD-EFGH', ''])(
    'rechaza el código %j',
    async (code) => {
      const { error } = await admin.from('welcome_coupons').insert({ code, email: newEmail() });
      expect(error).not.toBeNull();
    },
  );

  it.each(['sin-arroba', 'a@b', 'MAYUSCULAS@EXAMPLE.COM', 'a b@example.com', ''])('rechaza el email %j', async (email) => {
    const { error } = await admin.from('welcome_coupons').insert({ code: newCode(), email });
    expect(error).not.toBeNull();
  });

  it.each([0, 101, -5])('rechaza un porcentaje de %i', async (percent) => {
    const { error } = await admin.from('welcome_coupons').insert({ code: newCode(), email: newEmail(), percent_off: percent });
    expect(error).not.toBeNull();
  });
});

describe('orders: descuento y cupón (CA-134)', () => {
  it('un pedido sin cupón tiene descuento 0 y coupon_id nulo por defecto', async () => {
    const inserted = await admin
      .from('orders')
      .insert({ user_id: customer.id, total_cents: 1000, shipping_cents: 0, shipping_address: sampleAddress })
      .select('id, discount_cents, coupon_id')
      .single();
    expect(inserted.error).toBeNull();
    const row = inserted.data as { id: string; discount_cents: number; coupon_id: string | null };
    orderIds.push(row.id);
    expect(row.discount_cents).toBe(0);
    expect(row.coupon_id).toBeNull();
  });

  it('rechaza un descuento negativo', async () => {
    const { error } = await admin
      .from('orders')
      .insert({ user_id: customer.id, total_cents: 1000, shipping_cents: 0, discount_cents: -1, shipping_address: sampleAddress });
    expect(error).not.toBeNull();
  });

  it('un cupón no puede estar en dos pedidos no cancelados (23505)', async () => {
    const coupon = await insertCoupon();
    await insertOrder(customer.id, coupon.id);
    const second = await admin
      .from('orders')
      .insert({ user_id: other.id, total_cents: 1000, shipping_cents: 0, coupon_id: coupon.id, shipping_address: sampleAddress });
    expect(second.error?.code).toBe('23505');
  });

  it('si el primer pedido se cancela, el cupón puede ir en otro; los cancelados pueden repetirse', async () => {
    const coupon = await insertCoupon();
    const first = await insertOrder(customer.id, coupon.id);
    const cancel = await admin.from('orders').update({ status: 'cancelado' }).eq('id', first);
    expect(cancel.error).toBeNull();
    await insertOrder(other.id, coupon.id);
    const third = await insertOrder(customer.id, coupon.id).catch((error: unknown) => error);
    expect(third).toBeInstanceOf(Error);
  });

  it('un cliente no puede cambiar el descuento ni el cupón de su pedido', async () => {
    const coupon = await insertCoupon();
    const decoy = await insertCoupon();
    const orderId = await insertOrder(customer.id, coupon.id);
    await customer.client.from('orders').update({ discount_cents: 999999, coupon_id: decoy.id }).eq('id', orderId);
    const stored = await admin.from('orders').select('discount_cents, coupon_id').eq('id', orderId).single();
    expect(stored.data).toEqual({ discount_cents: 299, coupon_id: coupon.id });
  });

  it('el cupón puede leerse como código de un pedido propio solo desde el servidor: el cliente no ve la tabla aunque tenga pedido con cupón', async () => {
    const coupon = await insertCoupon();
    await insertOrder(customer.id, coupon.id);
    const { data } = await customer.client.from('welcome_coupons').select('code').eq('id', coupon.id);
    expect(data ?? []).toEqual([]);
  });

  it('al borrar el cupón, el pedido sigue (on delete set null)', async () => {
    const coupon = await insertCoupon();
    const orderId = await insertOrder(customer.id, coupon.id);
    const removed = await admin.from('welcome_coupons').delete().eq('id', coupon.id);
    expect(removed.error).toBeNull();
    const stored = await admin.from('orders').select('id, coupon_id').eq('id', orderId).single();
    expect(stored.data).toEqual({ id: orderId, coupon_id: null });
  });
});
