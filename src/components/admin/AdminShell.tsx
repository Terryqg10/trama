'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { ClipboardList, LayoutDashboard, Menu, Search, Store, X } from 'lucide-react';
import { Logo } from '../Logo';
import { useHashOverlay } from '../useHashOverlay';

const MENU_ID = 'menu-admin';

const NAV = [
  { href: '/admin', label: 'Resumen', Icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', Icon: ClipboardList, exact: false },
] as const;

const control =
  'inline-flex min-h-11 items-center justify-center rounded-control md:min-h-(--control-height)';
const iconButton = `${control} min-w-11 text-fg hover:bg-accent-soft hover:text-accent-text md:min-w-(--control-height)`;

/**
 * Marco del panel de administración (estilo v4-dense-workspace, ADR-008): sidebar fija en escritorio
 * (`--bp-lg`), que en pantallas menores es un drawer cerrable con Esc, clic fuera y botón; topbar con
 * búsqueda y atajo Ctrl+K (⌘K en Mac). Mejora progresiva igual que el menú de la tienda: el botón es un
 * enlace a `#menu-admin` y, sin JavaScript, `:target` abre el drawer.
 */
export function AdminShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const overlay = useHashOverlay(MENU_ID, '--bp-lg', { trigger: triggerRef, overlay: drawerRef, close: closeRef });

  // Atajo de búsqueda global: Ctrl+K o ⌘K lleva el foco al campo de la topbar.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function itemClass(href: string, exact: boolean): string {
    const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return `${control} w-full justify-start gap-3 px-3 text-sm ${
      current ? 'bg-accent-soft font-semibold text-accent-text' : 'font-medium text-fg hover:bg-accent-soft'
    }`;
  }

  function isCurrent(href: string, exact: boolean): boolean {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  const navList = (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ href, label, Icon, exact }) => (
        <li key={href}>
          <Link href={href} aria-current={isCurrent(href, exact) ? 'page' : undefined} className={itemClass(href, exact)}>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const shopLink = (
    <Link href="/" className={`${control} w-full justify-start gap-3 px-3 text-sm font-medium text-fg-muted hover:bg-accent-soft hover:text-accent-text`}>
      <Store aria-hidden="true" className="size-4 shrink-0" />
      Ver la tienda
    </Link>
  );

  return (
    <div data-style="v4" className="min-h-dvh flex-1 bg-bg text-fg">
      <aside className="hidden border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-(--sidebar-width) lg:flex-col">
        <div className="flex h-(--topbar-height) shrink-0 items-center border-b border-border px-4">
          <Logo />
        </div>
        <nav aria-label="Administración" className="flex-1 overflow-y-auto p-3">
          {navList}
        </nav>
        <div className="border-t border-border p-3">{shopLink}</div>
      </aside>

      <div className="min-w-0 lg:pl-(--sidebar-width)">
        <header className="sticky top-0 z-30 flex h-(--topbar-height) items-center gap-2 border-b border-border bg-surface px-(--layout-gutter)">
          <a
            ref={triggerRef}
            href={`#${MENU_ID}`}
            data-testid="admin-menu-open"
            aria-haspopup="dialog"
            aria-expanded={overlay.open}
            aria-label="Abrir menú de administración"
            onClick={(event) => {
              event.preventDefault();
              overlay.openOverlay();
            }}
            className={`${iconButton} lg:hidden`}
          >
            <Menu aria-hidden="true" className="size-5" />
          </a>

          <form action="/admin/pedidos" role="search" className="relative min-w-0 flex-1 md:max-w-md">
            <label htmlFor="admin-search" className="sr-only">
              Buscar pedidos por número o destinatario
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              ref={searchRef}
              id="admin-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Buscar pedido o destinatario"
              className={`${control} w-full border border-border-strong bg-surface pl-9 pr-3 text-sm text-fg md:pr-16`}
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-tile border border-border bg-surface-muted px-1.5 text-xs font-medium text-fg-muted md:block"
            >
              Ctrl K
            </kbd>
          </form>
        </header>

        <main id="contenido" className="px-(--layout-gutter) py-6">
          <div className="mx-auto max-w-(--layout-container)">{children}</div>
        </main>
      </div>

      <div className="lg:hidden">
        <div
          ref={drawerRef}
          id={MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de administración"
          data-testid="admin-menu"
          onKeyDown={overlay.onKeyDown}
          onClick={overlay.onClick}
          className={
            overlay.open
              ? 'fixed inset-0 z-50 flex'
              : overlay.mounted
                ? 'hidden'
                : 'hidden target:fixed target:inset-0 target:z-50 target:flex'
          }
        >
          <span tabIndex={0} onFocus={() => overlay.focusEdge('last')} data-focus-guard="start" />
          <div className="flex h-dvh w-(--sidebar-width) max-w-full flex-col border-r border-border bg-surface">
            <div className="flex h-(--topbar-height) shrink-0 items-center justify-between border-b border-border px-4">
              <Logo />
              <a
                ref={closeRef}
                href="#cerrar-menu"
                aria-label="Cerrar menú"
                data-testid="admin-menu-close"
                onClick={(event) => {
                  event.preventDefault();
                  overlay.close();
                }}
                className={iconButton}
              >
                <X aria-hidden="true" className="size-5" />
              </a>
            </div>
            <nav aria-label="Administración (móvil)" className="min-h-0 flex-1 overflow-y-auto p-3">
              {navList}
            </nav>
            <div className="border-t border-border p-3">{shopLink}</div>
          </div>
          {/* Clic fuera del panel: cierra el drawer. */}
          <a href="#cerrar-menu" aria-label="Cerrar menú" tabIndex={-1} className="flex-1 bg-fg/40" />
          <span tabIndex={0} onFocus={() => overlay.focusEdge('first')} data-focus-guard="end" />
        </div>
      </div>
    </div>
  );
}
