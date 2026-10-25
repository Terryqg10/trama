'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { sessionStatusAction } from '@/lib/auth/actions';
import { ACTION_NAV, MAIN_NAV } from '@/lib/domain/navigation';
import { AuthModal } from './account/AuthModal';
import { useCartDrawer } from './cart/CartDrawerContext';
import { SearchBar } from './layout/SearchBar';
import { Logo } from './Logo';
import { useHashOverlay } from './useHashOverlay';

const MENU_ID = 'menu-movil';
const SEARCH_ID = 'buscador';

const linkBase =
  'inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium';
const linkIdle = 'text-fg hover:bg-accent-soft hover:text-accent-text';
const linkCurrent = 'bg-accent-soft text-accent-text';
const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft hover:text-accent-text';

/** Enlaces del menú a pantalla completa: tipografía grande (≥ 20 px) y áreas amplias. */
const overlayLinkBase =
  'flex min-h-14 w-full items-center rounded-control px-4 text-xl font-semibold';

/**
 * Cabecera. En escritorio (≥ `--bp-md`) el menú es horizontal. En móvil es un overlay a
 * pantalla completa (SPEC-001, Enmienda 6): mejora progresiva con `#menu-movil` y `:target`
 * sin JavaScript; con JavaScript lo gestiona `useHashOverlay` (hash de entrada, Esc, foco,
 * scroll de fondo). Sin animación: `prefers-reduced-motion` ya queda cubierto.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { openCart } = useCartDrawer();
  // El modal de acceso está abierto mientras la ruta sea en la que se abrió: un acceso correcto redirige y lo cierra.
  const [authPath, setAuthPath] = useState<string | null>(null);
  const authOpen = authPath === pathname;
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);
  const overlay = useHashOverlay(MENU_ID, '--bp-md', {
    trigger: triggerRef,
    overlay: menuRef,
    close: closeRef,
  });

  const searchTriggerRef = useRef<HTMLAnchorElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchCloseRef = useRef<HTMLAnchorElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const search = useHashOverlay(SEARCH_ID, '--bp-lg', {
    trigger: searchTriggerRef,
    overlay: searchPanelRef,
    close: searchCloseRef,
  });

  // El hook enfoca el botón de cerrar al abrir; en el buscador el foco va al campo.
  useEffect(() => {
    if (search.open) searchInputRef.current?.focus();
  }, [search.open]);

  // Con JavaScript, el icono de usuario abre el modal si no hay sesión y lleva a `/cuenta` si la hay (CA-12, CA-13). Sin
  // JavaScript sigue siendo un enlace a `/cuenta`, que sin sesión redirige a `/acceso`. En las páginas de acceso navega.
  async function onAccountClick(event: ReactMouseEvent<HTMLAnchorElement>): Promise<void> {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (['/acceso', '/registro', '/recuperar'].includes(pathname)) return;
    event.preventDefault();
    const { signedIn } = await sessionStatusAction();
    if (signedIn) router.push(ACTION_NAV.account.href);
    else setAuthPath(pathname);
  }

  function itemClass(href: string): string {
    return `${linkBase} ${pathname === href ? linkCurrent : linkIdle}`;
  }

  function overlayItemClass(href: string): string {
    return `${overlayLinkBase} ${pathname === href ? linkCurrent : linkIdle}`;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface">
      <div className="mx-auto flex min-h-(--nav-height) max-w-(--layout-container) items-center gap-2 px-(--layout-gutter)">
        <Logo />

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 md:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={itemClass(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
          <SearchBar variant="inline" />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <a
            ref={searchTriggerRef}
            href={`#${SEARCH_ID}`}
            data-testid="search-open"
            aria-haspopup="dialog"
            aria-expanded={search.open}
            aria-label="Abrir buscador"
            onClick={(event) => {
              event.preventDefault();
              search.openOverlay();
            }}
            className={`${iconButton} lg:hidden`}
          >
            <Search aria-hidden="true" />
          </a>
          <Link
            href={ACTION_NAV.account.href}
            aria-label={ACTION_NAV.account.label}
            aria-haspopup="dialog"
            data-testid="account-open"
            onClick={onAccountClick}
            className={iconButton}
          >
            <User aria-hidden="true" />
          </Link>
          {/* Sigue siendo un enlace a /carrito (sin JavaScript navega); con JavaScript abre el carrito lateral (CA-124), salvo en
              /carrito, donde ya está la lista completa. */}
          <Link
            href={ACTION_NAV.cart.href}
            aria-label={ACTION_NAV.cart.label}
            aria-haspopup="dialog"
            data-testid="cart-open"
            onClick={(event) => {
              if (pathname === ACTION_NAV.cart.href || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              openCart();
            }}
            className={iconButton}
          >
            <ShoppingBag aria-hidden="true" />
          </Link>
          <a
            ref={triggerRef}
            href={`#${MENU_ID}`}
            data-testid="menu-open"
            aria-haspopup="dialog"
            aria-expanded={overlay.open}
            aria-label="Abrir menú"
            onClick={(event) => {
              event.preventDefault();
              overlay.openOverlay();
            }}
            className={`${iconButton} md:hidden`}
          >
            <Menu aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="lg:hidden">
        <div
          ref={searchPanelRef}
          id={SEARCH_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar productos"
          data-testid="search-panel"
          onKeyDown={search.onKeyDown}
          onClick={search.onClick}
          className={
            search.open
              ? 'fixed inset-0 z-50 flex h-dvh flex-col bg-surface'
              : search.mounted
                ? 'hidden'
                : 'hidden target:fixed target:inset-0 target:z-50 target:flex target:h-dvh target:flex-col target:bg-surface'
          }
        >
          <span tabIndex={0} onFocus={() => search.focusEdge('last')} data-focus-guard="start" />
          <div className="flex min-h-(--nav-height) shrink-0 items-center justify-between border-b border-border px-(--layout-gutter)">
            <p className="text-lg font-semibold text-fg">Buscar</p>
            <a
              ref={searchCloseRef}
              href="#cerrar-buscador"
              aria-label="Cerrar buscador"
              data-testid="search-close"
              onClick={(event) => {
                event.preventDefault();
                search.close();
              }}
              className={iconButton}
            >
              <X aria-hidden="true" />
            </a>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-(--layout-gutter) py-4">
            <SearchBar variant="overlay" inputRef={searchInputRef} onNavigate={search.close} />
          </div>
          <span tabIndex={0} onFocus={() => search.focusEdge('first')} data-focus-guard="end" />
        </div>
      </div>

      <div className="md:hidden">
        <div
          ref={menuRef}
          id={MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          data-testid="menu-overlay"
          onKeyDown={overlay.onKeyDown}
          onClick={overlay.onClick}
          className={
            overlay.open
              ? 'fixed inset-0 z-50 flex h-dvh flex-col bg-surface'
              : overlay.mounted
                ? 'hidden'
                : 'hidden target:fixed target:inset-0 target:z-50 target:flex target:h-dvh target:flex-col target:bg-surface'
          }
        >
          <span tabIndex={0} onFocus={() => overlay.focusEdge('last')} data-focus-guard="start" />
          <div className="flex min-h-(--nav-height) shrink-0 items-center justify-between border-b border-border px-(--layout-gutter)">
            <Logo />
            <a
              ref={closeRef}
              href="#cerrar-menu"
              aria-label="Cerrar menú"
              data-testid="menu-close"
              onClick={(event) => {
                event.preventDefault();
                overlay.close();
              }}
              className={iconButton}
            >
              <X aria-hidden="true" />
            </a>
          </div>

          <nav aria-label="Menú móvil" className="min-h-0 flex-1 overflow-y-auto px-(--layout-gutter) py-6">
            <ul className="flex flex-col gap-2">
              {MAIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className={overlayItemClass(item.href)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 gap-3 border-t border-border px-(--layout-gutter) py-4">
            <Link
              href={ACTION_NAV.account.href}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface text-sm font-semibold text-fg hover:bg-accent-soft"
            >
              <User aria-hidden="true" className="size-5" />
              {ACTION_NAV.account.label}
            </Link>
            <Link
              href={ACTION_NAV.cart.href}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface text-sm font-semibold text-fg hover:bg-accent-soft"
            >
              <ShoppingBag aria-hidden="true" className="size-5" />
              {ACTION_NAV.cart.label}
            </Link>
          </div>
          <span tabIndex={0} onFocus={() => overlay.focusEdge('first')} data-focus-guard="end" />
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthPath(null)} />
    </header>
  );
}
