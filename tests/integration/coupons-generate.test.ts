import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COUPON_CODE_PATTERN, COUPON_PERCENT_OFF, generateCouponCode } from '../../src/lib/coupons/code';
import { issueWelcomeCoupon } from '../../src/lib/coupons/store';
import { DAY_MS, newCouponEmail } from './coupon-fixtures';
import { serviceClient } from './helpers';

// CA-135 (T-093): el servidor crea un código único por email y lo recupera mientras sea válido. Contra la BD real; requiere
// la migración 20261023000000_welcome_coupons.sql aplicada.

let admin: SupabaseClient;
const emails: string[] = [];
const email = (): string => {
  const next = newCouponEmail();
  emails.push(next);
  return next;
};

async function rowsFor(address: string): Promise<{ code: string; expires_at: string; created_at: string; redeemed_at: string | null }[]> {
  const rows = await admin.from('welcome_coupons').select('code, expires_at, created_at, redeemed_at').eq('email', address);
  if (rows.error) throw new Error(rows.error.message);
  return rows.data as { code: string; expires_at: string; created_at: string; redeemed_at: string | null }[];
}

beforeAll(() => {
  admin = serviceClient();
});

afterAll(async () => {
  if (emails.length > 0) await admin.from('welcome_coupons').delete().in('email', emails);
});

describe('coupons-generate: alta de un email nuevo (CA-135)', () => {
  it('crea un código TRAMA-XXXX-XXXX del 10 % con 30 días de caducidad', async () => {
    const address = email();
    const result = await issueWelcomeCoupon(admin, address);
    expect(result.status).toBe('issued');
    if (result.status !== 'issued') return;
    expect(result.code).toMatch(COUPON_CODE_PATTERN);
    expect(result.percentOff).toBe(COUPON_PERCENT_OFF);
    const days = (Date.parse(result.expiresAt) - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
    const stored = await rowsFor(address);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.code).toBe(result.code);
  });

  it('el mismo email recibe el mismo código mientras sea válido, sin crear otra fila', async () => {
    const address = email();
    const first = await issueWelcomeCoupon(admin, address);
    const second = await issueWelcomeCoupon(admin, address);
    expect(first.status).toBe('issued');
    expect(second.status).toBe('existing');
    if (first.status === 'issued' && second.status === 'existing') expect(second.code).toBe(first.code);
    expect(await rowsFor(address)).toHaveLength(1);
  });

  it('cinco altas simultáneas del mismo email acaban con un solo código y todas lo devuelven', async () => {
    const address = email();
    const results = await Promise.all(Array.from({ length: 5 }, () => issueWelcomeCoupon(admin, address)));
    const codes = results.map((result) => ('code' in result ? result.code : null));
    expect(results.every((result) => result.status === 'issued' || result.status === 'existing')).toBe(true);
    expect(new Set(codes).size).toBe(1);
    expect(await rowsFor(address)).toHaveLength(1);
  });

  it('emails distintos reciben códigos distintos', async () => {
    const [a, b] = await Promise.all([issueWelcomeCoupon(admin, email()), issueWelcomeCoupon(admin, email())]);
    expect(a.status).toBe('issued');
    expect(b.status).toBe('issued');
    if (a.status === 'issued' && b.status === 'issued') expect(a.code).not.toBe(b.code);
  });
});

describe('coupons-generate: caducado y canjeado no se regeneran (CA-135)', () => {
  it('un cupón caducado se dice y no se genera otro', async () => {
    const address = email();
    const first = await issueWelcomeCoupon(admin, address);
    expect(first.status).toBe('issued');
    await admin.from('welcome_coupons').update({ expires_at: new Date(Date.now() - DAY_MS).toISOString() }).eq('email', address);
    const again = await issueWelcomeCoupon(admin, address);
    expect(again).toEqual({ status: 'expired' });
    const stored = await rowsFor(address);
    expect(stored).toHaveLength(1);
    if (first.status === 'issued') expect(stored[0]?.code).toBe(first.code);
  });

  it('un cupón canjeado se dice y no se genera otro', async () => {
    const address = email();
    await issueWelcomeCoupon(admin, address);
    await admin.from('welcome_coupons').update({ redeemed_at: new Date().toISOString() }).eq('email', address);
    expect(await issueWelcomeCoupon(admin, address)).toEqual({ status: 'redeemed' });
    expect(await rowsFor(address)).toHaveLength(1);
  });

  it('un cupón canjeado y caducado cuenta como canjeado', async () => {
    const address = email();
    await issueWelcomeCoupon(admin, address);
    await admin
      .from('welcome_coupons')
      .update({ redeemed_at: new Date(Date.now() - 2 * DAY_MS).toISOString(), expires_at: new Date(Date.now() - DAY_MS).toISOString() })
      .eq('email', address);
    expect(await issueWelcomeCoupon(admin, address)).toEqual({ status: 'redeemed' });
  });
});

describe('coupons-generate: colisiones y errores (CA-135)', () => {
  it('si el código sale repetido, reintenta con otro y conserva el email', async () => {
    const firstAddress = email();
    const fixed = generateCouponCode();
    const first = await issueWelcomeCoupon(admin, firstAddress, Date.now(), () => fixed);
    expect(first).toMatchObject({ status: 'issued', code: fixed });

    const secondAddress = email();
    const fresh = generateCouponCode();
    const sequence = [fixed, fresh];
    const generate = vi.fn(() => sequence.shift() ?? generateCouponCode());
    const second = await issueWelcomeCoupon(admin, secondAddress, Date.now(), generate);
    expect(second).toMatchObject({ status: 'issued', code: fresh });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(await rowsFor(secondAddress)).toHaveLength(1);
  });

  it('si no consigue un código distinto tras 5 intentos, devuelve error y no deja filas', async () => {
    const fixed = generateCouponCode();
    await issueWelcomeCoupon(admin, email(), Date.now(), () => fixed);
    const address = email();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const generate = vi.fn(() => fixed);
    const result = await issueWelcomeCoupon(admin, address, Date.now(), generate);
    spy.mockRestore();
    expect(result).toEqual({ status: 'error' });
    expect(generate).toHaveBeenCalledTimes(5);
    expect(await rowsFor(address)).toHaveLength(0);
  });

  it('un email que la base rechaza devuelve error sin lanzar ni registrar el email', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await issueWelcomeCoupon(admin, 'NO-ES-UN-EMAIL');
    const logged = spy.mock.calls.flat().join(' ');
    spy.mockRestore();
    expect(result).toEqual({ status: 'error' });
    expect(logged).not.toContain('NO-ES-UN-EMAIL');
  });
});
