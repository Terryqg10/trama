'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useSyncExternalStore, type ChangeEvent, type FocusEvent, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { Search } from 'lucide-react';
import {
  MAX_SEARCH_LENGTH,
  MIN_SUGGEST_LENGTH,
  parseSearchQuery,
  searchHitsSchema,
  type SearchHit,
} from '@/lib/catalog/search';
import { formatEuros } from '@/lib/domain/shop';

/** Espera tras la última tecla antes de pedir sugerencias (CA-107). */
export const SUGGEST_DEBOUNCE_MS = 300;

const noSubscription = (): (() => void) => () => undefined;

type Status = 'loading' | 'ok' | 'error';
interface Suggestions {
  readonly query: string;
  readonly status: Status;
  readonly hits: readonly SearchHit[];
}

const NO_RESULTS = 'No encontramos nada, prueba con otra palabra';
const optionClass =
  'flex min-h-14 items-center gap-3 px-3 py-2 text-sm text-fg aria-selected:bg-accent-soft hover:bg-accent-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';

/**
 * Buscador con sugerencias (RF-25, CA-107 y CA-108, T-064). Es un formulario GET a `/buscar` (funciona sin
 * JavaScript) con un combobox encima, según el patrón de lista de las APG: el foco se queda en el campo y las
 * opciones se señalan con `aria-activedescendant`. Desde 2 caracteres y tras 300 ms sin teclear pide hasta 5 productos
 * a `/api/search` (con `AbortController`, la respuesta se valida con Zod) y los muestra con miniatura, nombre y precio.
 * Las opciones son enlaces: funcionan el clic derecho y abrir en otra pestaña. La última es «Ver todos los
 * resultados». Flechas mueven la opción activa; Intro la abre (sin opción activa busca); Esc cierra la lista.
 *
 * `inline` (escritorio): lista flotante bajo el campo. `overlay` (móvil, a pantalla completa): lista en el flujo.
 */
export function SearchBar({
  variant,
  inputRef,
  onNavigate,
}: {
  readonly variant: 'inline' | 'overlay';
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  /** Se llama al navegar (a una ficha o a los resultados): el panel móvil se cierra. */
  readonly onNavigate?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-lista`;
  const optionId = (index: number): string => `${id}-opcion-${index}`;

  const [value, setValue] = useState('');
  // `true` cuando React ya controla el campo: antes de eso, lo escrito se perdería al hidratar.
  const ready = useSyncExternalStore(noSubscription, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<Suggestions>({ query: '', status: 'ok', hits: [] });

  const query = parseSearchQuery(value);
  const canSuggest = query.length >= MIN_SUGGEST_LENGTH;

  useEffect(() => {
    if (!canSuggest) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResult((previous) => ({ query, status: 'loading', hits: previous.hits }));
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const hits = searchHitsSchema.parse(await response.json());
        setResult({ query, status: 'ok', hits });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('SearchBar: no se pudieron cargar las sugerencias', error instanceof Error ? error.message : 'error');
        setResult({ query, status: 'error', hits: [] });
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, canSuggest]);

  const fresh = result.query === query;
  // Mientras se escribe se siguen mostrando las sugerencias anteriores (sin parpadeo) hasta que llegan las nuevas.
  const hits = canSuggest ? result.hits : [];
  const finished = fresh && result.status !== 'loading';
  const showPanel = open && canSuggest && (finished || hits.length > 0);
  const showOptions = showPanel && hits.length > 0;
  const showEmpty = open && canSuggest && finished && result.status === 'ok' && hits.length === 0;
  const showError = open && canSuggest && finished && result.status === 'error';
  const allHref = `/buscar?q=${encodeURIComponent(query)}`;
  const optionCount = showOptions ? hits.length + 1 : 0;

  function closeList(): void {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
  }

  function go(href: string): void {
    router.push(href as Route);
    closeList();
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    setValue(event.target.value);
    setActive(-1);
    setOpen(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    go(`/buscar?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (optionCount === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Posiciones: -1 (ninguna) y 0..optionCount-1; da la vuelta en los dos sentidos.
      setActive((current) => ((((current + 1 + step) % (optionCount + 1)) + optionCount + 1) % (optionCount + 1)) - 1);
    } else if (event.key === 'Enter' && showOptions && active >= 0) {
      event.preventDefault();
      const hit = hits[active];
      go(hit ? `/producto/${hit.slug}` : allHref);
    } else if (event.key === 'Escape' && showPanel) {
      // La primera pulsación cierra la lista; la siguiente (ya sin lista) la recoge el panel móvil.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  const activeId = showOptions && active >= 0 ? optionId(active) : undefined;
  const listClass =
    variant === 'inline'
      ? 'absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-card'
      : 'mt-4 overflow-hidden rounded-card border border-border bg-surface';

  return (
    <div className="relative w-full" onBlur={onBlur}>
      <form role="search" action="/buscar" method="get" onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            role="combobox"
            aria-label="Buscar productos"
            aria-autocomplete="list"
            aria-expanded={showOptions}
            aria-controls={listId}
            aria-activedescendant={activeId}
            placeholder="Buscar productos..."
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
            data-ready={ready}
            value={value}
            onChange={onChange}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="min-h-11 w-full rounded-control border border-border bg-surface-muted pl-10 pr-3 text-sm text-fg placeholder:text-fg-muted"
          />
        </div>
        {variant === 'overlay' ? (
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            Buscar
          </button>
        ) : null}
      </form>

      {/* Anuncia el número de sugerencias a los lectores de pantalla (el campo conserva el foco). */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {showOptions ? `${hits.length} ${hits.length === 1 ? 'sugerencia' : 'sugerencias'}` : ''}
      </p>

      {/* El `mousedown` no quita el foco del campo: así el clic llega al enlace aunque el navegador no enfoque enlaces. */}
      <div data-testid="search-suggestions" hidden={!showPanel} onMouseDown={(event) => event.preventDefault()} className={showPanel ? listClass : undefined}>
        <ul id={listId} role="listbox" aria-label="Sugerencias de productos" hidden={!showOptions}>
          {hits.map((hit, index) => (
            <li key={hit.id} role="none">
              <Link
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                href={`/producto/${hit.slug}`}
                tabIndex={-1}
                onClick={closeList}
                className={optionClass}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                  {hit.image ? (
                    <Image src={hit.image.path} alt="" width={48} height={48} unoptimized className="size-12 object-cover object-top" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{hit.name}</span>
                <span className="shrink-0 font-semibold">{formatEuros(hit.priceCents)}</span>
              </Link>
            </li>
          ))}
          <li role="none" className="border-t border-border">
            <Link
              id={optionId(hits.length)}
              role="option"
              aria-selected={active === hits.length}
              href={allHref as Route}
              tabIndex={-1}
              onClick={closeList}
              className={`${optionClass} font-semibold text-accent-text`}
            >
              Ver todos los resultados para «{query}»
            </Link>
          </li>
        </ul>
        {showEmpty ? (
          <p role="status" className="px-4 py-4 text-sm text-fg-muted">
            {NO_RESULTS}
          </p>
        ) : null}
        {showError ? (
          <p role="alert" className="px-4 py-4 text-sm text-danger">
            No se pudo buscar ahora mismo. Inténtalo de nuevo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
