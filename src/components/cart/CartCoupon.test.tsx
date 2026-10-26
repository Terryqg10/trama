import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CouponPreviewState } from '@/lib/coupons/preview-state';
import { COUPON_STORAGE_KEY } from '@/lib/coupons/stored-coupon';
import { CartCoupon } from './CartCoupon';

// CA-151 (T-120, nivel de componente): invitado, aplicar, error y quitar. La validación en servidor y el límite de intentos están
// en `coupon-actions.test.ts`; el recorrido completo, en el e2e `cart-coupon`.

const preview = vi.fn<(previous: CouponPreviewState, data: FormData) => Promise<CouponPreviewState>>();
vi.mock('@/lib/coupons/actions', () => ({
  applyCartCouponAction: (previous: CouponPreviewState, data: FormData) => preview(previous, data),
}));

beforeEach(() => {
  preview.mockReset();
  window.sessionStorage.clear();
});
afterEach(cleanup);

describe('CartCoupon (CA-151)', () => {
  it('un invitado ve cómo conseguirlo y no tiene campo', () => {
    render(<CartCoupon signedIn={false} coupon={null} onChange={vi.fn()} />);
    expect(screen.getByText('¿Tienes un código de descuento?')).toBeTruthy();
    expect(screen.getByTestId('coupon-guest').textContent).toContain('Inicia sesión para usar un código de descuento.');
    expect(screen.queryByTestId('cart-coupon-input')).toBeNull();
  });

  it('es un acordeón nativo y el campo admite 20 caracteres', () => {
    const { container } = render(<CartCoupon signedIn coupon={null} onChange={vi.fn()} />);
    expect(container.querySelector('details > summary')).toBeTruthy();
    expect(screen.getByTestId('cart-coupon-input').getAttribute('maxlength')).toBe('20');
  });

  it('aplica un código válido: avisa al carrito con el porcentaje y lo guarda para el pago', async () => {
    preview.mockResolvedValue({ status: 'applied', code: 'TRAMA-ABCD-EFGH', discountCents: 500, totalCents: 4000, percentOff: 10 });
    const onChange = vi.fn();
    render(<CartCoupon signedIn coupon={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('cart-coupon-input'), { target: { value: ' trama-abcd-efgh ' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('cart-coupon-apply'));
    });
    expect(preview.mock.calls[0]?.[1].get('couponCode')).toBe('trama-abcd-efgh');
    expect(onChange).toHaveBeenCalledWith({ code: 'TRAMA-ABCD-EFGH', percentOff: 10 });
    expect(JSON.parse(window.sessionStorage.getItem(COUPON_STORAGE_KEY) ?? 'null')).toEqual({ code: 'TRAMA-ABCD-EFGH', percentOff: 10 });
  });

  it('un código rechazado muestra el motivo y no guarda nada', async () => {
    preview.mockResolvedValue({ status: 'error', message: 'Ese código no existe. Revisa que esté bien escrito.' });
    const onChange = vi.fn();
    render(<CartCoupon signedIn coupon={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('cart-coupon-input'), { target: { value: 'XXXX' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('cart-coupon-apply'));
    });
    expect(screen.getByTestId('cart-coupon-error').textContent).toBe('Ese código no existe. Revisa que esté bien escrito.');
    expect(screen.getByTestId('cart-coupon-input').getAttribute('aria-invalid')).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(COUPON_STORAGE_KEY)).toBeNull();
  });

  it('con un código aplicado enseña «Quitar código», que lo descarta y limpia lo guardado', () => {
    window.sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code: 'TRAMA-ABCD-EFGH', percentOff: 10 }));
    const onChange = vi.fn();
    render(<CartCoupon signedIn coupon={{ code: 'TRAMA-ABCD-EFGH', percentOff: 10 }} onChange={onChange} />);
    expect(screen.getByTestId('cart-coupon-applied').textContent).toContain('TRAMA-ABCD-EFGH');
    fireEvent.click(screen.getByTestId('cart-coupon-remove'));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(window.sessionStorage.getItem(COUPON_STORAGE_KEY)).toBeNull();
  });

  it('un campo vacío no consulta al servidor', async () => {
    render(<CartCoupon signedIn coupon={null} onChange={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('cart-coupon-apply'));
    });
    expect(preview).not.toHaveBeenCalled();
  });
});
