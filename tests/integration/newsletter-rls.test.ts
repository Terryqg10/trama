import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonymousClient, createTestUser, deleteTestUser, serviceClient, type TestUser } from './helpers';

// CA-99 (T-058): newsletter_subscribers solo admite altas con consentimiento y nadie la lee, cambia ni borra con la
// clave pública. Requiere la migración 20261020000200_newsletter_subscribers.sql aplicada en Supabase.

const created: string[] = [];
let admin: SupabaseClient;
let customer: TestUser;
let anon: SupabaseClient;

const newEmail = (): string => {
  const email = `t058-${randomUUID().slice(0, 8)}@example.com`;
  created.push(email);
  return email;
};

beforeAll(async () => {
  admin = serviceClient();
  anon = anonymousClient();
  customer = await createTestUser(admin, 't058-cliente');
});

afterAll(async () => {
  if (created.length > 0) await admin.from('newsletter_subscribers').delete().in('email', created);
  await deleteTestUser(admin, customer.id);
});

describe('newsletter_subscribers: altas (CA-99)', () => {
  it('un visitante se suscribe con consentimiento y un email válido', async () => {
    const email = newEmail();
    const { error } = await anon.from('newsletter_subscribers').insert({ email, consent: true });
    expect(error).toBeNull();
    const stored = await admin.from('newsletter_subscribers').select('email, consent').eq('email', email).single();
    expect(stored.data).toEqual({ email, consent: true });
  });

  it('un cliente con sesión también puede suscribirse', async () => {
    const email = newEmail();
    const { error } = await customer.client.from('newsletter_subscribers').insert({ email, consent: true });
    expect(error).toBeNull();
  });

  it('rechaza el alta sin consentimiento', async () => {
    const { error } = await anon.from('newsletter_subscribers').insert({ email: newEmail(), consent: false });
    expect(error).not.toBeNull();
  });

  it.each(['sin-arroba', 'a@b', 'MAYUSCULAS@EXAMPLE.COM', 'a b@example.com', ''])('rechaza el email %j', async (email) => {
    const { error } = await anon.from('newsletter_subscribers').insert({ email, consent: true });
    expect(error).not.toBeNull();
  });

  it('rechaza un email repetido (23505)', async () => {
    const email = newEmail();
    expect((await anon.from('newsletter_subscribers').insert({ email, consent: true })).error).toBeNull();
    const second = await anon.from('newsletter_subscribers').insert({ email, consent: true });
    expect(second.error?.code).toBe('23505');
  });
});

describe('newsletter_subscribers: nadie lee, cambia ni borra con la clave pública (CA-99)', () => {
  let email: string;

  beforeAll(async () => {
    email = newEmail();
    const { error } = await admin.from('newsletter_subscribers').insert({ email, consent: true });
    expect(error).toBeNull();
  });

  it('un visitante no puede leer la lista', async () => {
    const { data } = await anon.from('newsletter_subscribers').select('email');
    expect(data ?? []).toEqual([]);
  });

  it('un cliente con sesión no puede leer la lista', async () => {
    const { data } = await customer.client.from('newsletter_subscribers').select('email');
    expect(data ?? []).toEqual([]);
  });

  it('tampoco se puede leer una fila concreta', async () => {
    const { data } = await anon.from('newsletter_subscribers').select('email').eq('email', email);
    expect(data ?? []).toEqual([]);
  });

  it('no se puede cambiar ni borrar: la fila sigue igual', async () => {
    await anon.from('newsletter_subscribers').update({ email: newEmail() }).eq('email', email);
    await customer.client.from('newsletter_subscribers').delete().eq('email', email);
    await anon.from('newsletter_subscribers').delete().eq('email', email);
    const stored = await admin.from('newsletter_subscribers').select('email, consent').eq('email', email);
    expect(stored.data).toEqual([{ email, consent: true }]);
  });
});
