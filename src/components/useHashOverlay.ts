'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

function subscribeHash(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
const noSubscription = (): (() => void) => () => undefined;

/**
 * Lógica común de los paneles a pantalla completa (drawer de filtros y menú móvil).
 *
 * Mejora progresiva: el botón es un enlace a `#<id>` y, sin JavaScript, el CSS `:target`
 * abre el panel. Con JavaScript se gestiona por estado: abre al entrar con el hash, Esc
 * cierra, el foco entra al abrir y vuelve al botón al cerrar, no hay scroll de fondo y el
 * panel se cierra si la pantalla alcanza el escritorio (`breakpointToken`, p. ej. `--bp-lg`;
 * `null` para un panel que sirve en todos los tamaños, como la guía de tallas).
 *
 * Una vez montado, el CSS `:target` deja de usarse (`mounted`): `history.replaceState` no lo
 * actualiza y el panel no se cerraría. Quien use el hook debe aplicar las clases de `:target`
 * solo mientras `mounted` sea falso.
 */
export function useHashOverlay(
  id: string,
  breakpointToken: string | null,
  refs: {
    readonly trigger: RefObject<HTMLAnchorElement | null>;
    readonly overlay: RefObject<HTMLDivElement | null>;
    readonly close: RefObject<HTMLAnchorElement | null>;
  },
) {
  const { trigger, overlay, close: closeLink } = refs;
  const [manualOpen, setManualOpen] = useState(false);
  const hashIsOverlay = useCallback((): boolean => window.location.hash === `#${id}`, [id]);
  const hashOpen = useSyncExternalStore(subscribeHash, hashIsOverlay, () => false);
  const open = manualOpen || hashOpen;
  // `false` en el servidor y al hidratar; `true` en el cliente ya montado.
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);

  const wasOpen = useRef(false);

  const close = useCallback((): void => {
    if (hashIsOverlay()) {
      // Se conserva `history.state`: ahí guarda su estado el enrutador de Next.
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
      // `replaceState` no avisa del cambio: se emite a mano para que se relea el hash.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    setManualOpen(false);
  }, [hashIsOverlay]);

  // Foco al abrir (en el botón de cerrar) y al cerrar (de vuelta al botón que lo abrió).
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeLink.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      trigger.current?.focus();
    }
  }, [open, closeLink, trigger]);

  // Sin scroll de fondo mientras el panel está abierto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Si la pantalla crece hasta el punto de corte, el panel deja de existir: se cierra.
  useEffect(() => {
    if (!open || breakpointToken === null) return;
    const width = getComputedStyle(document.documentElement)
      .getPropertyValue(breakpointToken)
      .trim();
    if (!width) return;
    const query = window.matchMedia(`(min-width: ${width})`);
    const onChange = (event: MediaQueryListEvent): void => {
      if (event.matches) close();
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [open, breakpointToken, close]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  // Trampa de foco con dos centinelas (a la entrada y a la salida del panel). No se mide el
  // primer y el último elemento: en Safari los enlaces no se alcanzan con Tab, así que el
  // «último» podría no ser el último tabulable.
  function focusEdge(edge: 'first' | 'last'): void {
    const items = Array.from(overlay.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const target = edge === 'first' ? items[0] : items[items.length - 1];
    target?.focus();
  }

  // Un enlace del panel (distinto del botón de cerrar) lo cierra: «Limpiar», un destino del menú… Salvo los que llevan
  // `data-keep-overlay`: filtrados en vivo (quitar un filtro activo, CA-16) que dejan el panel abierto, como los chips.
  function onClick(event: MouseEvent<HTMLElement>): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href]');
    if (link && link !== closeLink.current && overlay.current?.contains(link) && !link.hasAttribute('data-keep-overlay')) close();
  }

  return {
    open,
    mounted,
    openOverlay: () => setManualOpen(true),
    close,
    onKeyDown,
    onClick,
    focusEdge,
  };
}
