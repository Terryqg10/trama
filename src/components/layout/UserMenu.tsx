'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { AuthModal } from '@/components/account/AuthModal';
import { logoutAction, sessionStatusAction } from '@/lib/auth/actions';
import { announceAccountCart } from '@/lib/cart/count';
import { ACTION_NAV } from '@/lib/domain/navigation';

const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft hover:text-accent-text';

const itemClass =
  'flex min-h-11 w-full items-center px-4 text-start text-sm font-medium text-fg hover:bg-accent-soft focus-visible:bg-accent-soft focus-visible:outline-none';

const MENU_ITEMS = [
  { href: '/cuenta', label: 'Mis datos' },
  { href: '/cuenta/pedidos', label: 'Mis pedidos' },
  { href: '/cuenta/club', label: 'Trama Club' },
] as const;

/**
 * Icono de usuario de la cabecera (el menú se ancla a la cabecera en móvil y al icono desde 768 px) (RF-01, RF-17, CA-12, CA-13 y CA-17 a CA-20, T-105 y T-107). Sin JavaScript es un enlace a
 * `/cuenta` (que sin sesión redirige al acceso). Con JavaScript pregunta al servidor si hay sesión al pulsar: sin sesión abre
 * el modal de acceso; con sesión, un menú desplegable con el nombre y los accesos a la cuenta. El menú se cierra con un clic
 * fuera, con Esc (el foco vuelve al icono), al elegir una entrada y al cambiar de ruta; las flechas, Inicio y Fin recorren las
 * entradas y Tab saca el foco y lo cierra. En las páginas de acceso el icono navega.
 */
export function UserMenu() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Abiertos mientras la ruta sea en la que se abrieron: un acceso correcto o una navegación los cierra.
  const [authPath, setAuthPath] = useState<string | null>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [name, setName] = useState('');
  const authOpen = authPath === pathname;
  const menuOpen = menuPath === pathname;

  // La primera entrada recibe el foco al abrir.
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  // Clic fuera: cierra el menú.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setMenuPath(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  async function onTriggerClick(event: ReactMouseEvent<HTMLAnchorElement>): Promise<void> {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (['/acceso', '/registro', '/recuperar'].includes(pathname)) return;
    event.preventDefault();
    if (menuOpen) {
      setMenuPath(null);
      return;
    }
    const status = await sessionStatusAction();
    if (status.signedIn) {
      setName(status.name);
      setMenuPath(pathname);
    } else {
      setAuthPath(pathname);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuPath(null);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      setMenuPath(null);
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const target =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : event.key === 'ArrowUp'
          ? items[(index - 1 + items.length) % items.length]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items[items.length - 1]
              : undefined;
    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

  return (
    <div ref={containerRef} className="md:relative">
      <Link
        ref={triggerRef}
        href={ACTION_NAV.account.href}
        aria-label={ACTION_NAV.account.label}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        data-testid="account-open"
        onClick={onTriggerClick}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) onMenuKeyDown(event);
        }}
        className={iconButton}
      >
        <User aria-hidden="true" />
      </Link>

      {menuOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menú de la cuenta"
          data-testid="user-menu"
          onKeyDown={onMenuKeyDown}
          className="absolute right-(--layout-gutter) top-full z-50 mt-2 w-56 overflow-clip md:right-0 rounded-container border border-border bg-surface py-1 shadow-card"
        >
          <p
            data-testid="user-menu-greeting"
            className="border-b border-border px-4 py-3 text-sm font-bold text-accent-text"
          >
            {name === '' ? 'Hola' : `Hola, ${name}`}
          </p>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              tabIndex={-1}
              onClick={() => setMenuPath(null)}
              className={itemClass}
            >
              {item.label}
            </Link>
          ))}
          <form action={logoutAction} onSubmit={() => announceAccountCart(null)} role="none">
            <button type="submit" role="menuitem" tabIndex={-1} className={itemClass}>
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}

      <AuthModal open={authOpen} onClose={() => setAuthPath(null)} />
    </div>
  );
}
