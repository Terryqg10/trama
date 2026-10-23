import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CA-137 (T-094, nivel de componente): campo «Código de descuento», totales y campo oculto del pago. La validación real, el pago y la
// maquetación de 320 a 1280 px los comprueban los tests de integración y el e2e `checkout-coupon`.

const previewCouponAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/coupons/actions', () => ({ previewCouponAction }));
vi.mock('@/lib/checkout/actions', () => ({ startCheckoutAction: vi.fn() }));

import type { CouponPreviewState } from '@/lib/coupons/preview-state';
import { CheckoutCouponProvider } from './CheckoutCouponContext';
import { CheckoutForm, type CheckoutAddress } from './CheckoutForm';
import { CheckoutTotals } from './CheckoutTotals';
import { CouponBox } from './CouponBox';

const ADDRESS: CheckoutAddress = {
  id: '11111111-1111-4111-8111-111111111111',
  recipientName: 'Ana Pérez',
  line1: 'Calle Mayor 1',
  line2: null,
  postalCode: '28001',
  city: 'Madrid',
  province: 'Madrid',
};

const APPLIED: CouponPreviewState = {
  status: 'applied',
  message: 'Código aplicado: −1,99 €.',
  code: 'TRAMA-ABCD-EF23',
  discountCents: 199,
  totalCents: 2291,
};

function page(): ReturnType<typeof render> {
  return render(
    <CheckoutCouponProvider>
      <CouponBox />
      <CheckoutTotals subtotalCents={1995} shippingCents={495} totalCents={2490} />
      <CheckoutForm addresses={[ADDRESS]} disabled={false} />
    </CheckoutCouponProvider>,
  );
}

const input = () => screen.getByTestId('coupon-input') as HTMLInputElement;
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="couponCode"]');

async function apply(code: string): Promise<void> {
  fireEvent.change(input(), { target: { value: code } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  });
}

beforeEach(() => {
  previewCouponAction.mockReset();
});

afterEach(cleanup);

describe('CouponBox: el campo (CA-137)', () => {
  it('tiene una etiqueta visible, un botón «Aplicar» de 44 px y no autocompleta', () => {
    page();
    expect(screen.getByLabelText('Código de descuento')).toBe(input());
    const button = screen.getByRole('button', { name: 'Aplicar' });
    expect(button.className).toContain('min-h-11');
    expect(input().className).toContain('min-h-11');
    expect(input().getAttribute('autocomplete')).toBe('off');
    expect(input().maxLength).toBe(40);
  });

  it('con el campo vacío no pide nada al servidor', async () => {
    page();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    });
    expect(previewCouponAction).not.toHaveBeenCalled();
  });

  it('«Aplicar» manda solo el texto del código y también se aplica con Intro', async () => {
    previewCouponAction.mockResolvedValue(APPLIED);
    page();
    fireEvent.change(input(), { target: { value: 'trama-abcd-ef23' } });
    await act(async () => {
      fireEvent.submit(input().closest('form') as HTMLFormElement);
    });
    expect(previewCouponAction).toHaveBeenCalledTimes(1);
    const sent = previewCouponAction.mock.calls[0]?.[1] as FormData;
    expect([...sent.keys()]).toEqual(['couponCode']);
    expect(sent.get('couponCode')).toBe('trama-abcd-ef23');
  });

  it('avisa de que hay que pulsar «Aplicar» si se escribió un código y no se aplicó', () => {
    page();
    expect(screen.queryByTestId('coupon-hint')).toBeNull();
    fireEvent.change(input(), { target: { value: 'TRAMA-ABCD-EF23' } });
    expect(screen.getByTestId('coupon-hint').textContent).toBe('Pulsa «Aplicar» para usar este código.');
    expect(input().getAttribute('aria-describedby')).toBe(screen.getByTestId('coupon-hint').id);
  });
});

describe('CouponBox: un código válido (CA-137)', () => {
  it('enseña el descuento, añade la línea «Descuento» a los totales y cambia el total', async () => {
    previewCouponAction.mockResolvedValue(APPLIED);
    page();
    expect(screen.queryByTestId('checkout-discount')).toBeNull();
    expect(screen.getByTestId('checkout-total').textContent).toContain('24,90');

    await apply('TRAMA-ABCD-EF23');
    const applied = screen.getByTestId('coupon-applied');
    expect(applied.textContent).toContain('TRAMA-ABCD-EF23');
    expect(applied.textContent).toContain('1,99');
    expect(screen.getByTestId('checkout-discount').textContent).toContain('1,99');
    expect(screen.getByTestId('checkout-total').textContent).toContain('22,91');
    expect(screen.getByTestId('checkout-subtotal').textContent).toContain('19,95');
    expect(screen.getByTestId('checkout-shipping').textContent).toContain('4,95');
    expect(screen.queryByTestId('coupon-input')).toBeNull();
    expect(screen.getByTestId('coupon-message').getAttribute('aria-live')).toBe('polite');
  });

  it('el formulario de pago lleva el código aplicado en un campo oculto, no los importes', async () => {
    previewCouponAction.mockResolvedValue(APPLIED);
    page();
    expect(hidden()?.value).toBe('');
    await apply('trama-abcd-ef23');
    expect(hidden()?.value).toBe('TRAMA-ABCD-EF23');
    const names = [...document.querySelectorAll('form input[name]')].map((field) => field.getAttribute('name'));
    expect(names).not.toContain('discount_cents');
    expect(names).not.toContain('total_cents');
    expect(names).not.toContain('price');
  });

  it('«Quitar código» devuelve los importes originales, vacía el campo oculto y conserva lo escrito', async () => {
    previewCouponAction.mockResolvedValue(APPLIED);
    page();
    await apply('TRAMA-ABCD-EF23');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Quitar código' }));
    });
    expect(screen.queryByTestId('coupon-applied')).toBeNull();
    expect(screen.queryByTestId('checkout-discount')).toBeNull();
    expect(screen.getByTestId('checkout-total').textContent).toContain('24,90');
    expect(hidden()?.value).toBe('');
    expect(input().value).toBe('TRAMA-ABCD-EF23');
  });

  it('después de quitarlo se puede volver a aplicar', async () => {
    previewCouponAction.mockImplementation(async () => ({ ...APPLIED }));
    page();
    await apply('TRAMA-ABCD-EF23');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Quitar código' }));
    });
    await apply('TRAMA-ABCD-EF23');
    expect(screen.getByTestId('coupon-applied')).toBeTruthy();
    expect(screen.getByTestId('checkout-total').textContent).toContain('22,91');
    expect(hidden()?.value).toBe('TRAMA-ABCD-EF23');
  });
});

describe('CouponBox: un código que no vale (CA-137)', () => {
  it('enseña el motivo como alerta, marca el campo y conserva lo escrito', async () => {
    previewCouponAction.mockResolvedValue({ status: 'error', message: 'Ese código ha caducado.' });
    page();
    await apply('TRAMA-ABCD-EF23');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Ese código ha caducado.');
    expect(input().value).toBe('TRAMA-ABCD-EF23');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toContain(alert.id);
    expect(screen.queryByTestId('checkout-discount')).toBeNull();
    expect(screen.getByTestId('checkout-total').textContent).toContain('24,90');
    expect(hidden()?.value).toBe('');
    expect(screen.queryByTestId('coupon-hint')).toBeNull();
  });

  it('el error se anuncia dentro de una región aria-live', async () => {
    previewCouponAction.mockResolvedValue({ status: 'error', message: 'Ese código no existe. Revisa que esté bien escrito.' });
    page();
    await apply('TRAMA-ZZZZ-ZZZZ');
    expect(screen.getByTestId('coupon-message').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByTestId('coupon-message').textContent).toContain('no existe');
  });
});

describe('CheckoutTotals sin proveedor (CA-137)', () => {
  it('enseña los importes del pedido tal cual y sin línea de descuento', () => {
    render(<CheckoutTotals subtotalCents={5000} shippingCents={0} totalCents={5000} />);
    expect(screen.getByTestId('checkout-subtotal').textContent).toContain('50,00');
    expect(screen.getByTestId('checkout-shipping').textContent).toBe('Gratis');
    expect(screen.getByTestId('checkout-total').textContent).toContain('50,00');
    expect(screen.queryByTestId('checkout-discount')).toBeNull();
  });
});

describe('CheckoutForm sin proveedor (CA-137)', () => {
  it('lleva el campo oculto del código, vacío', () => {
    render(<CheckoutForm addresses={[ADDRESS]} disabled={false} />);
    expect(hidden()?.value).toBe('');
  });
});
