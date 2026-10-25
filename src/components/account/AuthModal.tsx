'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { LoginForm, RegisterForm } from './AuthForms';

export const AUTH_MODAL_IMAGE = '/images/products/auth-banner.webp';

type Tab = 'login' | 'register';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const tabClass =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-control px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Modal de acceso (RF-01, CA-12 y CA-13, T-105): pestañas «Iniciar sesión» y «Crear cuenta» con los mismos formularios y
 * acciones de servidor que `/acceso` y `/registro`. Desde 768 px, imagen a la izquierda y formulario a la derecha; por debajo,
 * solo el formulario. Esc, la X y el fondo lo cierran; el foco entra, queda atrapado y vuelve a quien lo abrió; el `body` no
 * hace scroll. Un error de credenciales se anuncia dentro del formulario y no cierra el modal. La cabecera lo cierra al
 * cambiar de ruta (un acceso correcto redirige).
 */
export function AuthModal({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('login');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setTab('login');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    dialogRef.current?.focus();

    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      event.preventDefault();
      if (!first || !last) return;
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? items.indexOf(active) : -1;
      if (index === -1) {
        (event.shiftKey ? last : first).focus();
      } else {
        const step = event.shiftKey ? -1 : 1;
        items[(index + step + items.length) % items.length]?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, close]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: Tab = tab === 'login' ? 'register' : 'login';
    setTab(next);
    (next === 'login' ? loginTabRef : registerTabRef).current?.focus();
  }

  if (!open) return null;

  return (
    <div data-testid="auth-modal-root" className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div aria-hidden="true" data-testid="auth-modal-backdrop" onClick={close} className="absolute inset-0 bg-fg/50" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="auth-modal"
        className="promo-enter relative grid max-h-full w-full max-w-3xl overflow-y-auto rounded-container bg-surface shadow-2xl focus:outline-none md:grid-cols-2"
      >
        <button
          type="button"
          aria-label="Cerrar"
          data-testid="auth-modal-close"
          onClick={close}
          className="absolute right-2 top-2 z-10 inline-flex size-11 items-center justify-center rounded-control text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {/* Imagen decorativa a la izquierda desde 768 px: es el primer elemento del DOM, sin reordenar con CSS. */}
        <div className="relative hidden min-h-96 md:block" data-testid="auth-modal-image">
          <Image src={AUTH_MODAL_IMAGE} alt="" fill unoptimized sizes="24rem" className="object-cover" />
        </div>
        <div className="p-6 pt-14 md:p-10 md:pt-14">
          <h2 id={titleId} className="text-2xl font-bold text-fg">
            {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <div role="tablist" aria-label="Acceso" className="mt-4 flex gap-2 rounded-control bg-surface-muted p-1">
            <button
              ref={loginTabRef}
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-selected={tab === 'login'}
              aria-controls="auth-panel"
              tabIndex={tab === 'login' ? 0 : -1}
              data-testid="auth-tab-login"
              onClick={() => setTab('login')}
              onKeyDown={onTabKeyDown}
              className={`${tabClass} ${tab === 'login' ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg'}`}
            >
              Iniciar sesión
            </button>
            <button
              ref={registerTabRef}
              type="button"
              role="tab"
              id="auth-tab-register"
              aria-selected={tab === 'register'}
              aria-controls="auth-panel"
              tabIndex={tab === 'register' ? 0 : -1}
              data-testid="auth-tab-register"
              onClick={() => setTab('register')}
              onKeyDown={onTabKeyDown}
              className={`${tabClass} ${tab === 'register' ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg'}`}
            >
              Crear cuenta
            </button>
          </div>
          <div
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={tab === 'login' ? 'auth-tab-login' : 'auth-tab-register'}
            className="mt-6"
          >
            {tab === 'login' ? (
              <LoginForm onSwitch={() => setTab('register')} />
            ) : (
              <RegisterForm onSwitch={() => setTab('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
