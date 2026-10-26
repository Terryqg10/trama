'use client';

import { createContext, startTransition, useActionState, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { previewCouponAction } from '@/lib/coupons/actions';
import { initialCouponPreview, type CouponPreviewState } from '@/lib/coupons/preview-state';
import { clearStoredCoupon, readStoredCoupon } from '@/lib/coupons/stored-coupon';

/**
 * Estado del código de descuento en el pago (RF-27, CA-137, T-094). Lo comparten el campo «Código de descuento», los totales del
 * resumen y el formulario de pago, que están en columnas distintas. El resultado de «Aplicar» es solo una vista previa: al pagar, el
 * servidor vuelve a validar el texto del código y recalcula los importes, así que nada de lo que hay aquí fija un precio.
 * Fuera del proveedor (tests de componentes) el contexto es inerte.
 */

export interface AppliedCoupon {
  readonly code: string;
  readonly discountCents: number;
  readonly totalCents: number;
}

interface CheckoutCouponValue {
  /** Último resultado de «Aplicar», salvo que se haya quitado el código. */
  readonly state: CouponPreviewState;
  readonly applied: AppliedCoupon | null;
  readonly pending: boolean;
  readonly apply: (code: string) => void;
  readonly remove: () => void;
}

const IDLE: CheckoutCouponValue = {
  state: initialCouponPreview,
  applied: null,
  pending: false,
  apply: () => undefined,
  remove: () => undefined,
};

const CheckoutCouponContext = createContext<CheckoutCouponValue>(IDLE);

function appliedFrom(state: CouponPreviewState): AppliedCoupon | null {
  if (state.status !== 'applied' || state.code === undefined || state.discountCents === undefined || state.totalCents === undefined) {
    return null;
  }
  return { code: state.code, discountCents: state.discountCents, totalCents: state.totalCents };
}

export function CheckoutCouponProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch, pending] = useActionState(previewCouponAction, initialCouponPreview);
  // «Quitar código» recuerda qué resultado se descartó: uno nuevo de «Aplicar» es otro objeto y vuelve a valer.
  const [removed, setRemoved] = useState<CouponPreviewState | null>(null);
  const visible = state === removed ? initialCouponPreview : state;

  const apply = useCallback(
    (code: string) => {
      const data = new FormData();
      data.set('couponCode', code);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );
  const remove = useCallback(() => {
    clearStoredCoupon();
    setRemoved(state);
  }, [state]);

  // Un código aplicado en el carrito lateral (CA-151) se vuelve a validar aquí, en el servidor. Si ya no vale (usado, caducado,
  // límite de intentos), se descarta y el mensaje de error se ve en el campo.
  const auto = useRef<'todo' | 'enviado' | 'hecho'>('todo');
  useEffect(() => {
    if (auto.current === 'todo') {
      const stored = readStoredCoupon();
      if (stored) {
        auto.current = 'enviado';
        apply(stored.code);
      } else {
        auto.current = 'hecho';
      }
    } else if (auto.current === 'enviado' && state.status !== 'idle') {
      auto.current = 'hecho';
      if (state.status === 'error') clearStoredCoupon();
    }
  }, [apply, state]);

  const value = useMemo<CheckoutCouponValue>(
    () => ({ state: visible, applied: appliedFrom(visible), pending, apply, remove }),
    [visible, pending, apply, remove],
  );
  return <CheckoutCouponContext value={value}>{children}</CheckoutCouponContext>;
}

export function useCheckoutCoupon(): CheckoutCouponValue {
  return useContext(CheckoutCouponContext);
}
