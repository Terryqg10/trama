import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonymousClient, deleteTestUser, serviceClient } from './helpers';

let admin: SupabaseClient;
let userId: string;
const email = `auth-${randomUUID()}@example.test`;
const oldPassword = randomUUID();
const newPassword = randomUUID();

beforeAll(async () => {
  admin = serviceClient();
  const created = await admin.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Cliente de recuperación' },
  });
  if (created.error || !created.data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${created.error?.message ?? 'sin usuario'}`);
  }
  userId = created.data.user.id;
});

afterAll(async () => {
  if (userId) await deleteTestUser(admin, userId);
});

describe('registro: el perfil se crea con el nombre (CA-06, test auth-register-login)', () => {
  it('el trigger crea el perfil de cliente con el nombre de los metadatos', async () => {
    const profile = await admin.from('profiles').select('full_name, role').eq('id', userId).single();
    expect(profile.error).toBeNull();
    expect(profile.data).toEqual({ full_name: 'Cliente de recuperación', role: 'customer' });
  });
});

describe('recuperación de contraseña (CA-59, test auth-recovery-reset)', () => {
  it('con el enlace generado se fija una contraseña nueva y se puede iniciar sesión con ella', async () => {
    const link = await admin.auth.admin.generateLink({ type: 'recovery', email });
    expect(link.error).toBeNull();
    const tokenHash = link.data.properties?.hashed_token;
    expect(tokenHash).toBeTruthy();

    // El navegador del cliente: el enlace abre una sesión de recuperación…
    const browser = anonymousClient();
    const verified = await browser.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash ?? '' });
    expect(verified.error).toBeNull();
    expect(verified.data.user?.id).toBe(userId);

    // …con la que se fija la contraseña nueva.
    const updated = await browser.auth.updateUser({ password: newPassword });
    expect(updated.error).toBeNull();

    const withNew = await anonymousClient().auth.signInWithPassword({ email, password: newPassword });
    expect(withNew.error).toBeNull();
    expect(withNew.data.user?.id).toBe(userId);

    const withOld = await anonymousClient().auth.signInWithPassword({ email, password: oldPassword });
    expect(withOld.error).not.toBeNull();
  });

  it('un enlace de recuperación solo sirve una vez', async () => {
    const link = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const tokenHash = link.data.properties?.hashed_token ?? '';

    const first = await anonymousClient().auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    expect(first.error).toBeNull();
    const second = await anonymousClient().auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    expect(second.error).not.toBeNull();
  });
});
