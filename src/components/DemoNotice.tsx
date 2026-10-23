'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DemoNoticeProps {
  /** Título breve (puede llevar un elemento, como un código); sin él, solo se muestra el texto. */
  readonly title?: ReactNode;
  readonly children: ReactNode;
  /** Valor que copia el botón (por ejemplo, el número de la tarjeta de prueba). Sin él, no hay botón. */
  readonly copy?: { readonly value: string; readonly label: string };
  readonly testId?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

const RESET_MS = 2500;

/**
 * Aviso de demostración (RF-28, CA-140, T-091). Es una nota (`role="note"`) para quien prueba la tienda de portfolio.
 * El botón de copiar es solo una comodidad: el texto sigue visible y seleccionable si el navegador no deja usar el
 * portapapeles, y el resultado se anuncia en una región `aria-live`.
 */
export function DemoNotice({ title, children, copy, testId }: DemoNoticeProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyValue(): Promise<void> {
    if (!copy) return;
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(copy.value);
    } catch {
      next = 'failed';
    }
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), RESET_MS);
  }

  return (
    <aside role="note" data-testid={testId} className="rounded-card border border-border-strong bg-surface-muted p-4 text-sm">
      {title ? <p className="font-semibold text-fg">{title}</p> : null}
      <div className={title ? 'mt-1 text-fg-muted' : 'text-fg-muted'}>{children}</div>
      {copy ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="demo-notice-copy"
            onClick={() => void copyValue()}
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {state === 'copied' ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copy.label}
          </button>
          <span role="status" data-testid="demo-notice-status" className="text-fg-muted">
            {state === 'copied' ? 'Copiado.' : state === 'failed' ? 'No se pudo copiar: selecciónalo a mano.' : ''}
          </span>
        </div>
      ) : null}
    </aside>
  );
}
