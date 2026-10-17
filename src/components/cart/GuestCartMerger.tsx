'use client';

import { useEffect } from 'react';
import { writeCart } from '@/lib/cart/store';
import { useGuestCartMerge } from '@/lib/cart/use-guest-merge';

/**
 * Al llegar a la cuenta. Si el inicio de sesión ya fusionó el carrito en el servidor
 * (`merged`), solo vacía el del navegador. Si no, intenta la fusión como respaldo (CA-04).
 */
export function GuestCartMerger({ merged }: { readonly merged: boolean }) {
  useGuestCartMerge(!merged);
  useEffect(() => {
    if (merged) writeCart([]);
  }, [merged]);
  return null;
}
