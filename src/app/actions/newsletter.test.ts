import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialNewsletterState } from '@/lib/newsletter/state';

// CA-103 y CA-104 (T-061, nivel unitario): la acción guarda la alta como pendiente y devuelve el enlace de confirmación; con el
// campo trampa relleno descarta la alta sin guardar nada y responde como si hubiera ido bien. La base de datos y el cupón se
// sustituyen por dobles.

const subscribe = vi.fn();
const issue = vi.fn();

vi.mock('@/lib/newsletter/subscribe', () => ({
  subscribeToNewsletter: (...args: unknown[]) => subscribe(...args),
  confirmHref: (token: string) => `/newsletter/confirmar?token=${token}`,
}));
vi.mock('@/lib/coupons/store', () => ({ issueWelcomeCoupon: (...args: unknown[]) => issue(...args) }));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }));

import { subscribeAction } from './newsletter';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const TOKEN = 'B'.repeat(43);

beforeEach(() => {
  subscribe.mockReset();
  issue.mockReset();
  issue.mockResolvedValue({ status: 'error' });
});

describe('subscribeAction (CA-103)', () => {
  it('guarda la alta y devuelve el aviso de «falta un paso» con el enlace de confirmación', async () => {
    subscribe.mockResolvedValue({ ok: true, token: TOKEN });
    const state = await subscribeAction(initialNewsletterState, form({ email: 'Ana@Example.com', consent: 'on' }));
    expect(subscribe.mock.calls[0]?.[0]).toEqual({ email: 'ana@example.com', consent: true });
    expect(state.status).toBe('success');
    expect(state.message).toContain('Falta un paso');
    expect(state.confirm).toEqual({ href: `/newsletter/confirmar?token=${TOKEN}` });
  });

  it('sin consentimiento o con un email inválido no guarda nada', async () => {
    const state = await subscribeAction(initialNewsletterState, form({ email: 'a@b.es' }));
    expect(state.status).toBe('error');
    expect(state.fieldErrors?.consent).toBeTruthy();
    expect((await subscribeAction(initialNewsletterState, form({ email: 'nope', consent: 'on' }))).status).toBe('error');
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('un fallo al guardar devuelve error sin enlace', async () => {
    subscribe.mockResolvedValue({ ok: false });
    const state = await subscribeAction(initialNewsletterState, form({ email: 'a@b.es', consent: 'on' }));
    expect(state.status).toBe('error');
    expect(state.confirm).toBeUndefined();
  });
});

describe('subscribeAction: honeypot (CA-104)', () => {
  it('con el campo trampa relleno no guarda, no emite cupón y responde como un éxito sin enlace', async () => {
    const state = await subscribeAction(initialNewsletterState, form({ email: 'bot@example.com', consent: 'on', website: 'https://spam.example' }));
    expect(state.status).toBe('success');
    expect(state.confirm).toBeUndefined();
    expect(state.coupon).toBeUndefined();
    expect(subscribe).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
  });

  it('un campo trampa solo con espacios cuenta como vacío (autorrelleno del navegador)', async () => {
    subscribe.mockResolvedValue({ ok: true, token: TOKEN });
    const state = await subscribeAction(initialNewsletterState, form({ email: 'a@b.es', consent: 'on', website: '   ' }));
    expect(state.confirm).toBeTruthy();
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
