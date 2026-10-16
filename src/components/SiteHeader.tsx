'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { ACTION_NAV, MAIN_NAV } from '@/lib/domain/navigation';
import { Logo } from './Logo';

const linkBase =
  'inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium';
const linkIdle = 'text-fg hover:bg-accent-soft hover:text-accent-text';
const linkCurrent = 'bg-accent-soft text-accent-text';
const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft hover:text-accent-text';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && !headerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  function itemClass(href: string): string {
    return `${linkBase} ${pathname === href ? linkCurrent : linkIdle}`;
  }

  return (
    <header ref={headerRef} className="border-b border-border bg-surface">
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

        <div className="ml-auto flex items-center gap-1">
          <Link href={ACTION_NAV.account.href} aria-label={ACTION_NAV.account.label} className={iconButton}>
            <User aria-hidden="true" />
          </Link>
          <Link href={ACTION_NAV.cart.href} aria-label={ACTION_NAV.cart.label} className={iconButton}>
            <ShoppingBag aria-hidden="true" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className={`${iconButton} md:hidden`}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="menu-movil"
          aria-label="Menú móvil"
          className="border-t border-border bg-surface md:hidden"
        >
          <ul className="mx-auto flex max-w-(--layout-container) flex-col gap-1 px-(--layout-gutter) py-3">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className={`${itemClass(item.href)} w-full`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
