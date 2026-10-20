'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type FormEvent, type MouseEvent, type RefObject } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { MAX_SEARCH_LENGTH, parseSearchQuery } from '@/lib/catalog/search';
import { ACTION_NAV, MAIN_NAV } from '@/lib/domain/navigation';
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
 * Campo de búsqueda (RF-25, CA-91 y CA-92). Es un formulario GET a `/buscar`, así que funciona sin JavaScript; con
 * JavaScript se navega sin recargar la página y se cierra el panel móvil (`onSearch`).
 */
function SearchField({
  className,
  inputRef,
  onSearch,
  showButton = false,
}: {
  readonly className?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly onSearch?: () => void;
  readonly showButton?: boolean;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = parseSearchQuery(new FormData(event.currentTarget).get('q')?.toString());
    router.push(`/buscar?q=${encodeURIComponent(query)}` as Route);
    onSearch?.();
  }

  return (
    <form role="search" action="/buscar" method="get" onSubmit={onSubmit} className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          aria-label="Buscar productos"
          placeholder="Buscar productos..."
          maxLength={MAX_SEARCH_LENGTH}
          autoComplete="off"
          className="min-h-11 w-full rounded-control border border-border bg-surface-muted pl-10 pr-3 text-sm text-fg placeholder:text-fg-muted"
        />
      </div>
      {showButton ? (
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Buscar
        </button>
      ) : null}
    </form>
  );
}

/**
 * Cabecera. En escritorio (≥ `--bp-md`) el menú es horizontal. En móvil es un overlay a
 * pantalla completa (SPEC-001, Enmienda 6): mejora progresiva con `#menu-movil` y `:target`
 * sin JavaScript; con JavaScript lo gestiona `useHashOverlay` (hash de entrada, Esc, foco,
 * scroll de fondo). Sin animación: `prefers-reduced-motion` ya queda cubierto.
 */
export function SiteHeader() {
  const pathname = usePathname();
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

  function onSearchPanelClick(event: MouseEvent<HTMLElement>): void {
    if (event.target === event.currentTarget) search.close();
    else search.onClick(event);
  }

  function itemClass(href: string): string {
    return `${linkBase} ${pathname === href ? linkCurrent : linkIdle}`;
  }

  function overlayItemClass(href: string): string {
    return `${overlayLinkBase} ${pathname === href ? linkCurrent : linkIdle}`;
  }

  return (
    <header className="border-b border-border bg-surface">
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
          <SearchField className="w-full max-w-md" />
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
          <Link href={ACTION_NAV.account.href} aria-label={ACTION_NAV.account.label} className={iconButton}>
            <User aria-hidden="true" />
          </Link>
          <Link href={ACTION_NAV.cart.href} aria-label={ACTION_NAV.cart.label} className={iconButton}>
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
          onClick={onSearchPanelClick}
          className={
            search.open
              ? 'fixed inset-0 z-50 bg-fg/50'
              : search.mounted
                ? 'hidden'
                : 'hidden target:fixed target:inset-0 target:z-50 target:block target:bg-fg/50'
          }
        >
          <span tabIndex={0} onFocus={() => search.focusEdge('last')} data-focus-guard="start" />
          <div className="bg-surface px-(--layout-gutter) py-4 shadow-card">
            <div className="flex items-center gap-2">
              <SearchField className="min-w-0 flex-1" inputRef={searchInputRef} onSearch={search.close} showButton />
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
    </header>
  );
}
