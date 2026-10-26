import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { confirmSubscription, subscribeToNewsletter } from '../../src/lib/newsletter/subscribe';
import { createNewsletterStore } from '../../src/lib/newsletter/store';
import { TOKEN_TTL_MS, generateConfirmToken, hashConfirmToken } from '../../src/lib/newsletter/token';
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

// CA-103 (T-061, Enmienda 50): doble confirmación. Requiere la migración 20261027000000_newsletter_double_optin.sql aplicada.
describe('newsletter_subscribers: doble confirmación (CA-103)', () => {
  const store = () => createNewsletterStore(admin);
  const tokenFor = (): string => generateConfirmToken();

  it('la clave pública solo puede dar de alta filas SIN confirmar y sin token (no se salta la confirmación)', async () => {
    const confirmed = await anon
      .from('newsletter_subscribers')
      .insert({ email: newEmail(), consent: true, confirmed_at: new Date().toISOString() });
    expect(confirmed.error).not.toBeNull();
    const withToken = await anon
      .from('newsletter_subscribers')
      .insert({ email: newEmail(), consent: true, confirm_token_hash: 'a'.repeat(64) });
    expect(withToken.error).not.toBeNull();
    const email = newEmail();
    expect((await anon.from('newsletter_subscribers').insert({ email, consent: true })).error).toBeNull();
    const stored = await admin.from('newsletter_subscribers').select('confirmed_at').eq('email', email).single();
    expect(stored.data).toEqual({ confirmed_at: null });
  });

  it('el hash del token tiene que ser SHA-256 en hexadecimal', async () => {
    const { error } = await admin
      .from('newsletter_subscribers')
      .insert({ email: newEmail(), consent: true, confirm_token_hash: 'no-es-un-hash' });
    expect(error).not.toBeNull();
  });

  it('alta pendiente → confirmar: guarda solo el hash, caduca a las 24 h, confirma una vez y borra el token', async () => {
    const email = newEmail();
    const token = tokenFor();
    const now = Date.now();
    expect(await subscribeToNewsletter({ email, consent: true }, store(), now, () => token)).toEqual({ ok: true, token });

    const pending = await admin
      .from('newsletter_subscribers')
      .select('confirmed_at, confirm_token_hash, confirm_expires_at')
      .eq('email', email)
      .single();
    expect(pending.data?.confirmed_at).toBeNull();
    expect(pending.data?.confirm_token_hash).toBe(hashConfirmToken(token));
    expect(JSON.stringify(pending.data)).not.toContain(token);
    expect(Date.parse(pending.data?.confirm_expires_at as string)).toBe(now + TOKEN_TTL_MS);

    expect(await confirmSubscription(token, store(), now + 1000)).toBe('confirmed');
    const confirmed = await admin
      .from('newsletter_subscribers')
      .select('confirmed_at, confirm_token_hash, confirm_expires_at')
      .eq('email', email)
      .single();
    expect(confirmed.data?.confirmed_at).not.toBeNull();
    expect(confirmed.data?.confirm_token_hash).toBeNull();
    expect(confirmed.data?.confirm_expires_at).toBeNull();

    // Un solo uso: el mismo enlace ya no vale.
    expect(await confirmSubscription(token, store(), now + 2000)).toBe('invalid');
  });

  it('un token caducado no confirma y la alta sigue pendiente', async () => {
    const email = newEmail();
    const token = tokenFor();
    const now = Date.now();
    await subscribeToNewsletter({ email, consent: true }, store(), now, () => token);
    expect(await confirmSubscription(token, store(), now + TOKEN_TTL_MS + 1000)).toBe('expired');
    const stored = await admin.from('newsletter_subscribers').select('confirmed_at').eq('email', email).single();
    expect(stored.data?.confirmed_at).toBeNull();
  });

  it('un token inventado no confirma nada', async () => {
    expect(await confirmSubscription(tokenFor(), store())).toBe('invalid');
  });

  it('volver a suscribirse renueva el token (el anterior deja de valer) y un confirmado conserva su fecha', async () => {
    const email = newEmail();
    const first = tokenFor();
    const second = tokenFor();
    const now = Date.now();
    await subscribeToNewsletter({ email, consent: true }, store(), now, () => first);
    await subscribeToNewsletter({ email, consent: true }, store(), now + 10, () => second);
    expect(await confirmSubscription(first, store(), now + 20)).toBe('invalid');
    expect(await confirmSubscription(second, store(), now + 20)).toBe('confirmed');
    const confirmedAt = (await admin.from('newsletter_subscribers').select('confirmed_at').eq('email', email).single()).data?.confirmed_at;

    // Ya confirmado: la respuesta es la misma (un token nuevo) y confirmar de nuevo no cambia la fecha original.
    const third = tokenFor();
    expect(await subscribeToNewsletter({ email, consent: true }, store(), now + 1000, () => third)).toEqual({ ok: true, token: third });
    expect(await confirmSubscription(third, store(), now + 2000)).toBe('confirmed');
    const after = await admin.from('newsletter_subscribers').select('confirmed_at').eq('email', email).single();
    expect(after.data?.confirmed_at).toBe(confirmedAt);
  });
});
