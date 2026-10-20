import { afterEach, describe, expect, it, vi } from 'vitest';
import { newsletterSchema } from './schema';
import { subscribeToNewsletter } from './subscribe';

// CA-100 (T-059): validación con Zod y alta idempotente de la suscripción.

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

function clientWith(error: { code?: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn(() => ({ insert }));
  return { client: { from }, from, insert };
}

describe('subscribeToNewsletter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserta el email y el consentimiento en newsletter_subscribers y devuelve éxito', async () => {
    const { client, from, insert } = clientWith(null);
    const result = await subscribeToNewsletter({ email: 'a@b.es', consent: true }, client);
    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('newsletter_subscribers');
    expect(insert).toHaveBeenCalledWith({ email: 'a@b.es', consent: true });
  });

  it('un email ya suscrito (23505) responde igual que uno nuevo', async () => {
    const { client } = clientWith({ code: '23505' });
    expect(await subscribeToNewsletter({ email: 'a@b.es', consent: true }, client)).toEqual({ ok: true });
  });

  it('cualquier otro error devuelve fallo y no se registra el email', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { client } = clientWith({ code: '42501' });
    expect(await subscribeToNewsletter({ email: 'secreto@b.es', consent: true }, client)).toEqual({ ok: false });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secreto@b.es');
  });
});
