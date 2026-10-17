import { describe, expect, it } from 'vitest';
import { parseEnv, parsePublicSupabaseEnv, parseServiceSupabaseEnv } from './env';

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-value',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-value',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc',
  STRIPE_SECRET_KEY: 'sk_test_abc',
  STRIPE_WEBHOOK_SECRET: 'whsec_abc',
};

describe('parseEnv (CA-24)', () => {
  it('acepta un entorno con claves de test', () => {
    const env = parseEnv(validEnv);
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_abc');
  });

  it('rechaza una clave secreta Stripe live', () => {
    expect(() => parseEnv({ ...validEnv, STRIPE_SECRET_KEY: 'sk_live_abc' })).toThrow(
      /sk_test_/,
    );
  });

  it('rechaza una clave pública Stripe live', () => {
    expect(() =>
      parseEnv({ ...validEnv, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_abc' }),
    ).toThrow(/pk_test_/);
  });

  it('rechaza una variable ausente', () => {
    const { STRIPE_WEBHOOK_SECRET: _omitted, ...incomplete } = validEnv;
    expect(() => parseEnv(incomplete)).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it('rechaza una URL de Supabase inválida', () => {
    expect(() => parseEnv({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: 'no-es-url' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});

describe('parsePublicSupabaseEnv (T-005a)', () => {
  it('acepta solo la URL y la clave pública, sin claves de Stripe', () => {
    const env = parsePublicSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: validEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('no devuelve la clave de servicio aunque esté en el origen', () => {
    const env = parsePublicSupabaseEnv(validEnv);
    expect(Object.keys(env).sort()).toEqual([
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
    ]);
  });

  it('rechaza una URL inválida', () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'no-es-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'x',
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('rechaza una clave pública ausente', () => {
    expect(() =>
      parsePublicSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});

describe('parseServiceSupabaseEnv (T-019)', () => {
  it('acepta la URL y la clave de servicio sin exigir las de Stripe', () => {
    const env = parseServiceSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-test-value',
    });
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-test-value');
  });

  it('rechaza si falta la clave de servicio', () => {
    expect(() => parseServiceSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});
