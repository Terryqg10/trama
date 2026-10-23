'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Estado del carrito lateral (CA-124, T-085, Enmienda 37): `isCartOpen`, `openCart()` y `closeCart()`. Vive en el layout para que
 * lo abran el icono de la cabecera y el botón de añadir de cualquier página.
 *
 * Se guarda la ruta en la que se abrió: si la ruta cambia (el usuario pulsa un enlace del carrito, «Atrás»…) el carrito se
 * considera cerrado sin necesidad de un efecto. `openerRef` recuerda qué elemento tenía el foco al abrir, para devolvérselo al cerrar.
 * Fuera del proveedor (tests de componentes) el contexto no hace nada.
 */
interface CartDrawerState {
  readonly isCartOpen: boolean;
  readonly openCart: () => void;
  readonly closeCart: () => void;
  /** Cuántas veces se ha abierto: el cuerpo del carrito se vuelve a montar en cada apertura para leer datos frescos. */
  readonly openCount: number;
  /** Elemento al que vuelve el foco al cerrar. */
  readonly openerRef: { current: HTMLElement | null };
}

const NO_OPENER: { current: HTMLElement | null } = { current: null };
const IDLE: CartDrawerState = {
  isCartOpen: false,
  openCart: () => undefined,
  closeCart: () => undefined,
  openCount: 0,
  openerRef: NO_OPENER,
};

const CartDrawerContext = createContext<CartDrawerState>(IDLE);

export function CartDrawerProvider({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);

  const openCart = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpenedAt(pathname);
    setOpenCount((count) => count + 1);
  }, [pathname]);
  const closeCart = useCallback(() => setOpenedAt(null), []);

  const value = useMemo<CartDrawerState>(
    () => ({ isCartOpen: openedAt !== null && openedAt === pathname, openCart, closeCart, openCount, openerRef }),
    [openedAt, pathname, openCart, closeCart, openCount],
  );
  return <CartDrawerContext value={value}>{children}</CartDrawerContext>;
}

export function useCartDrawer(): CartDrawerState {
  return useContext(CartDrawerContext);
}
