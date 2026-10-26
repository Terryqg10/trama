import { afterEach, describe, expect, it, vi } from 'vitest';
import { newsletterSchema } from './schema';
import type { NewsletterStore, StoredToken } from './store';
import { confirmHref, confirmSubscription, subscribeToNewsletter } from './subscribe';
import { TOKEN_TTL_MS, confirmTokenSchema, generateConfirmToken, hashConfirmToken, tokenExpiry } from './token';

// CA-100 (T-059) y CA-103 (T-061, Enmienda 50): validación con Zod, alta pendiente con token con hash y confirmación de un solo uso.

describe('newsletterSchema', () => {
  it('acepta un email válido con el consentimiento marcado y lo pasa a minúsculas', () => {
    const result = newsletterSchema.safeParse({ email: '  Ana@Example.COM ', consent: 'on' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ email: 'ana@example.com', consent: true });
  });

  it('acepta el consentimiento como «true»', () => {
    expect(newsletterSchema.safeParse({ email: 'a@b.es', consent: 'true' }).success).toBe(true);
  });

  it.each(['', '   ', 'sin-arroba', 'a@', '@b.es', 'a b@c.es'])('rechaza el email %j', (email) => {
    const result = newsletterSchema.safeParse({ email, consent: 'on' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['email']);
  });

  it('rechaza un email de más de 254 caracteres', () => {
    expect(newsletterSchema.safeParse({ email: `${'a'.repeat(250)}@b.es`, consent: 'on' }).success).toBe(false);
  });

  it.each([undefined, '', 'off', 'false', 'no'])('rechaza el consentimiento %j (es expreso)', (consent) => {
    const result = newsletterSchema.safeParse({ email: 'a@b.es', consent });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['consent']);
  });

  it('rechaza si falta el email', () => {
    expect(newsletterSchema.safeParse({ consent: 'on' }).success).toBe(false);
  });
});

const NOW = Date.parse('2026-10-27T10:00:00Z');
const TOKEN = 'A'.repeat(43);

function fakeStore(overrides: Partial<NewsletterStore> = {}) {
  const store = {
    savePending: vi.fn().mockResolvedValue(undefined),
    findByTokenHash: vi.fn<(hash: string) => Promise<StoredToken | null>>().mockResolvedValue(null),
    markConfirmed: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return store;
}

describe('token de confirmación (CA-103)', () => {
  it('son 32 bytes aleatorios en base64url (43 caracteres) que cumplen el esquema', () => {
    const token = generateConfirmToken();
    expect(token).toHaveLength(43);
    expect(confirmTokenSchema.safeParse(token).success).toBe(true);
    expect(generateConfirmToken()).not.toBe(token);
  });

  it('el hash es SHA-256 en hexadecimal y no contiene el token', () => {
    const hash = hashConfirmToken(TOKEN);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(TOKEN);
    expect(hashConfirmToken(TOKEN)).toBe(hash);
  });

  it('caduca a las 24 horas', () => {
    expect(TOKEN_TTL_MS).toBe(86_400_000);
    expect(tokenExpiry(NOW)).toBe('2026-10-28T10:00:00.000Z');
  });

  it.each(['', 'corto', `${'A'.repeat(42)}!`, 'A'.repeat(44), ' '.repeat(43)])('rechaza el token %j', (value) => {
    expect(confirmTokenSchema.safeParse(value).success).toBe(false);
  });
});

describe('subscribeToNewsletter (CA-103)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda la alta pendiente con el HASH del token y su caducidad, y devuelve el token', async () => {
    const savePending = vi.fn().mockResolvedValue(undefined);
    const result = await subscribeToNewsletter({ email: 'a@b.es', consent: true }, fakeStore({ savePending }), NOW, () => TOKEN);
    expect(result).toEqual({ ok: true, token: TOKEN });
    expect(savePending).toHaveBeenCalledWith({
      email: 'a@b.es',
      tokenHash: hashConfirmToken(TOKEN),
      expiresAt: '2026-10-28T10:00:00.000Z',
    });
    expect(JSON.stringify(savePending.mock.calls)).not.toContain(TOKEN);
  });

  it('el enlace de confirmación lleva el token a la página de confirmación', () => {
    expect(confirmHref(TOKEN)).toBe(`/newsletter/confirmar?token=${TOKEN}`);
  });

  it('un fallo de la base de datos devuelve fallo y no se registra el email', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = fakeStore({ savePending: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(await subscribeToNewsletter({ email: 'secreto@b.es', consent: true }, store, NOW)).toEqual({ ok: false });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secreto@b.es');
  });
});

describe('confirmSubscription (CA-103)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('confirma con un token vigente y gasta el token', async () => {
    const store = fakeStore({
      findByTokenHash: vi.fn().mockResolvedValue({ confirmedAt: null, expiresAt: '2026-10-28T10:00:00.000Z' }),
    });
    expect(await confirmSubscription(TOKEN, store, NOW)).toBe('confirmed');
    expect(store.findByTokenHash).toHaveBeenCalledWith(hashConfirmToken(TOKEN));
    expect(store.markConfirmed).toHaveBeenCalledWith(hashConfirmToken(TOKEN), '2026-10-27T10:00:00.000Z');
  });

  it('un token caducado no confirma nada', async () => {
    const store = fakeStore({
      findByTokenHash: vi.fn().mockResolvedValue({ confirmedAt: null, expiresAt: '2026-10-27T09:59:59.000Z' }),
    });
    expect(await confirmSubscription(TOKEN, store, NOW)).toBe('expired');
    expect(store.markConfirmed).not.toHaveBeenCalled();
  });

  it('un token desconocido o ya gastado no confirma nada', async () => {
    const store = fakeStore();
    expect(await confirmSubscription(TOKEN, store, NOW)).toBe('invalid');
    expect(store.markConfirmed).not.toHaveBeenCalled();
  });

  it('si otra petición lo gastó entre la lectura y la escritura, es inválido', async () => {
    const store = fakeStore({
      findByTokenHash: vi.fn().mockResolvedValue({ confirmedAt: null, expiresAt: '2026-10-28T10:00:00.000Z' }),
      markConfirmed: vi.fn().mockResolvedValue(false),
    });
    expect(await confirmSubscription(TOKEN, store, NOW)).toBe('invalid');
  });

  it('un token con forma inválida ni siquiera consulta la base de datos', async () => {
    const store = fakeStore();
    for (const value of [null, undefined, 42, '', 'abc', `${'A'.repeat(42)}'`]) {
      expect(await confirmSubscription(value, store, NOW)).toBe('invalid');
    }
    expect(store.findByTokenHash).not.toHaveBeenCalled();
  });

  it('un fallo de la base de datos devuelve error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = fakeStore({ findByTokenHash: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(await confirmSubscription(TOKEN, store, NOW)).toBe('error');
  });
});
