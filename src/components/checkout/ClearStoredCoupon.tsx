'use client';

import { useEffect } from 'react';
import { clearStoredCoupon } from '@/lib/coupons/stored-coupon';

/** En la página de «Gracias» el cupón ya está gastado: se olvida el código guardado por el carrito lateral (CA-151). */
export function ClearStoredCoupon() {
  useEffect(() => {
    clearStoredCoupon();
  }, []);
  return null;
}
