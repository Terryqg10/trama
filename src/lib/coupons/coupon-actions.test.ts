import { beforeEach, describe, expect, it, vi } from 'vitest';

// CA-151 y CA-152 (T-120, nivel unitario): la acción valida el texto con Zod, cuenta los intentos por cuenta (3 por minuto) y,
// al superarlos, no consulta la BD. Los accesos a la sesión, el carrito y los cupones se sustituyen por dobles.

const check = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('@/lib/auth/session', () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock('@/lib/cart/account', () => ({ loadAccountCart: () => Promise.resolve([{ variantId: 'v1', qty: 1 }]) }));
vi.mock('@/lib/cart/lines', () => ({ fetchCartLines: () => Promise.resolve([]) }));
vi.mock('@/lib/checkout/summary', () => ({
  buildCheckoutSummary: () => ({
    lines: [{ variantId: 'v1' }],
    issues: [],
    totals: { subtotalCents: 5000, shippingCents: 495, totalCents: 5495, missingForFreeCents: 0 },
  }),
}));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }));
vi.mock('./store', () => ({ checkCouponForUser: (...args: unknown[]) => check(...args) }));

import { applyCartCouponAction as previewCouponAction, previewCouponAction as checkoutCouponAction } from './actions';
import { initialCouponPreview } from './preview-state';

function form(code: string): FormData {
  const data = new FormData();
  data.set('couponCode', code);
  return data;
}

let counter = 0;
function newUser(): void {
  counter += 1;
  getCurrentUser.mockResolvedValue({ client: {}, user: { id: `user-${counter}` } });
}

beforeEach(() => {
  check.mockReset();
  getCurrentUser.mockReset();
  newUser();
});

describe('applyCartCouponAction: validación (CA-151)', () => {
  it('rechaza un texto vacío o de más de 20 caracteres sin tocar la BD', async () => {
    expect((await previewCouponAction(initialCouponPreview, form('   '))).message).toBe('Escribe un código.');
    expect((await previewCouponAction(initialCouponPreview, form('A'.repeat(21)))).message).toBe('Ese código no es válido.');
    expect(check).not.toHaveBeenCalled();
  });

  it('normaliza a mayúsculas, devuelve el descuento y el porcentaje', async () => {
    check.mockResolvedValue({ ok: true, coupon: { id: 'c1', code: 'TRAMA-ABCD-EFGH', percentOff: 10 } });
    const result = await previewCouponAction(initialCouponPreview, form(' trama-abcd-efgh '));
    expect(check.mock.calls[0]?.[2]).toBe('TRAMA-ABCD-EFGH');
    expect(result).toMatchObject({ status: 'applied', code: 'TRAMA-ABCD-EFGH', discountCents: 500, percentOff: 10 });
  });

  it('sin sesión no consulta ni cuenta intentos', async () => {
    getCurrentUser.mockResolvedValue({ client: {}, user: null });
    const result = await previewCouponAction(initialCouponPreview, form('TRAMA-ABCD-EFGH'));
    expect(result.message).toBe('Inicia sesión para usar un código de descuento.');
    expect(check).not.toHaveBeenCalled();
  });
});

describe('applyCartCouponAction: límite de intentos (CA-152)', () => {
  it('al 4.º intento en un minuto no consulta la BD y pide esperar; otra cuenta no se ve afectada', async () => {
    check.mockResolvedValue({ ok: false, reason: 'unknown' });
    for (let i = 0; i < 3; i += 1) {
      const result = await previewCouponAction(initialCouponPreview, form('TRAMA-AAAA-AAAA'));
      expect(result.message).toBe('Ese código no existe. Revisa que esté bien escrito.');
    }
    const blocked = await previewCouponAction(initialCouponPreview, form('TRAMA-AAAA-AAAA'));
    expect(blocked.status).toBe('error');
    expect(blocked.message).toMatch(/^Demasiados intentos\. Espera \d+ segundos?\.$/);
    expect(check).toHaveBeenCalledTimes(3);

    newUser();
    expect((await previewCouponAction(initialCouponPreview, form('TRAMA-AAAA-AAAA'))).message).toBe(
      'Ese código no existe. Revisa que esté bien escrito.',
    );
  });

  it('cuentan también los intentos acertados', async () => {
    check.mockResolvedValue({ ok: true, coupon: { id: 'c1', code: 'TRAMA-ABCD-EFGH', percentOff: 10 } });
    for (let i = 0; i < 3; i += 1) {
      expect((await previewCouponAction(initialCouponPreview, form('TRAMA-ABCD-EFGH'))).status).toBe('applied');
    }
    expect((await previewCouponAction(initialCouponPreview, form('TRAMA-ABCD-EFGH'))).message).toMatch(/Demasiados intentos/);
  });
});

describe('previewCouponAction (pago): sin límite propio', () => {
  it('admite más de 3 intentos seguidos', async () => {
    check.mockResolvedValue({ ok: false, reason: 'unknown' });
    for (let i = 0; i < 5; i += 1) {
      expect((await checkoutCouponAction(initialCouponPreview, form('TRAMA-AAAA-AAAA'))).message).toBe(
        'Ese código no existe. Revisa que esté bien escrito.',
      );
    }
    expect(check).toHaveBeenCalledTimes(5);
  });
});
