'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useHydrated } from '@/lib/cart/store';
import type { PriceRange as Bounds } from '@/lib/catalog/facets';

/** Pausa tras la última flecha del teclado antes de filtrar: una petición por gesto, no por pulsación. */
const KEY_COMMIT_DELAY_MS = 500;
const COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

const fieldClass =
  'min-h-11 w-full min-w-0 rounded-control border border-border-strong bg-surface ps-3 pe-8 text-sm text-fg ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const euroClass = 'pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted';

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/** Par de campos «Mín.» y «Máx.» con «€»: el precio sin JavaScript (se aplica con «Aplicar filtros», RF-04). */
function PriceFields({ min, max }: { readonly min: number | undefined; readonly max: number | undefined }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-fg">Precio</legend>
      <div className="flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Precio mínimo (€)</span>
          <input type="number" name="min" inputMode="numeric" placeholder="Mín." min={0} max={99999} step={1} defaultValue={min ?? ''} className={fieldClass} />
          <span aria-hidden="true" className={euroClass}>
            €
          </span>
        </label>
        <span aria-hidden="true" className="text-fg-muted">
          –
        </span>
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Precio máximo (€)</span>
          <input type="number" name="max" inputMode="numeric" placeholder="Máx." min={0} max={99999} step={1} defaultValue={max ?? ''} className={fieldClass} />
          <span aria-hidden="true" className={euroClass}>
            €
          </span>
        </label>
      </div>
    </fieldset>
  );
}

/**
 * Intervalo de precio con dos tiradores (CA-15, T-079, Enmienda 6 de SPEC-002). Dos `<input type="range">` nativos
 * superpuestos (teclado, lectores de pantalla y táctil sin librería) y los campos «Mín.» y «Máx.», que cambian en
 * tiempo real mientras se arrastra. El listado se filtra **al soltar** (o poco después de la última flecha), con
 * `requestSubmit()` sobre el formulario de filtros. Un extremo en su límite no se filtra: sus campos ocultos van vacíos.
 * Sin JavaScript (antes de hidratar) y sin intervalo posible se pinta el par de campos numéricos.
 */
export function PriceRange({
  bounds,
  min,
  max,
}: {
  readonly bounds: Bounds | null;
  /** Mínimo y máximo vigentes en la URL, en euros. */
  readonly min: number | undefined;
  readonly max: number | undefined;
}) {
  const hydrated = useHydrated();
  if (!hydrated || !bounds) return <PriceFields min={min} max={max} />;
  return <PriceSlider bounds={bounds} min={min} max={max} />;
}

function PriceSlider({
  bounds,
  min,
  max,
}: {
  readonly bounds: Bounds;
  readonly min: number | undefined;
  readonly max: number | undefined;
}) {
  const urlLo = clamp(min ?? bounds.min, bounds.min, bounds.max);
  const urlHi = clamp(max ?? bounds.max, bounds.min, bounds.max);
  const urlKey = `${urlLo}-${urlHi}`;

  const [lo, setLo] = useState(urlLo);
  const [hi, setHi] = useState(urlHi);
  const [loText, setLoText] = useState(String(urlLo));
  const [hiText, setHiText] = useState(String(urlHi));
  const [applied, setApplied] = useState(urlKey);
  const [syncedLo, setSyncedLo] = useState(urlLo);
  const [syncedHi, setSyncedHi] = useState(urlHi);
  const [commitTick, setCommitTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitLatest = useRef<() => void>(() => undefined);

  // La URL manda: «Limpiar», «Atrás» o un enlace devuelven los tiradores y los números a su valor. Se ajusta durante el
  // render (patrón de React para derivar estado de una prop), no en un efecto. Cada extremo por separado: si se aplica
  // el mínimo, lo que se esté escribiendo en el máximo no se pierde.
  if (syncedLo !== urlLo) {
    setSyncedLo(urlLo);
    setApplied(urlKey);
    setLo(urlLo);
    setLoText(String(urlLo));
  }
  if (syncedHi !== urlHi) {
    setSyncedHi(urlHi);
    setApplied(urlKey);
    setHi(urlHi);
    setHiText(String(urlHi));
  }

  // Filtra tras renderizar: así los campos ocultos ya llevan el valor nuevo cuando se envía el formulario.
  useEffect(() => {
    if (commitTick === 0) return;
    rootRef.current?.closest('form')?.requestSubmit();
  }, [commitTick]);

  useEffect(() => {
    commitLatest.current = () => commit(lo, hi);
  });
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function commit(nextLo: number, nextHi: number): void {
    const key = `${nextLo}-${nextHi}`;
    if (key === applied) return;
    setApplied(key);
    setCommitTick((tick) => tick + 1);
  }

  function setValues(nextLo: number, nextHi: number): void {
    setLo(nextLo);
    setHi(nextHi);
    setLoText(String(nextLo));
    setHiText(String(nextHi));
  }

  function onKeyUp(event: KeyboardEvent<HTMLInputElement>): void {
    if (!COMMIT_KEYS.has(event.key)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitLatest.current(), KEY_COMMIT_DELAY_MS);
  }

  function commitText(which: 'lo' | 'hi'): void {
    const raw = which === 'lo' ? loText : hiText;
    const typed = raw.trim() === '' ? Number.NaN : Math.round(Number(raw));
    let nextLo = lo;
    let nextHi = hi;
    if (Number.isFinite(typed)) {
      if (which === 'lo') nextLo = clamp(typed, bounds.min, hi);
      else nextHi = clamp(typed, lo, bounds.max);
    }
    setValues(nextLo, nextHi);
    commit(nextLo, nextHi);
  }

  function onTextKeyDown(event: KeyboardEvent<HTMLInputElement>, which: 'lo' | 'hi'): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commitText(which);
  }

  const span = bounds.max - bounds.min;
  const left = ((lo - bounds.min) / span) * 100;
  const right = 100 - ((hi - bounds.min) / span) * 100;
  // El tirador de arriba cambia con la posición: si los dos coinciden en un extremo, el de encima sigue pudiendo separarse.
  const loOnTop = lo >= (bounds.min + bounds.max) / 2;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-fg">Precio</legend>
      <div ref={rootRef} data-testid="price-range">
        {/* Lo que se envía: vacío si el tirador está en su límite (ese extremo no se filtra). */}
        <input type="hidden" name="min" value={lo > bounds.min ? String(lo) : ''} />
        <input type="hidden" name="max" value={hi < bounds.max ? String(hi) : ''} />
        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Precio mínimo (€)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Mín."
              min={bounds.min}
              max={bounds.max}
              step={1}
              value={loText}
              data-testid="price-min"
              onChange={(event) => setLoText(event.target.value)}
              onBlur={() => commitText('lo')}
              onKeyDown={(event) => onTextKeyDown(event, 'lo')}
              className={fieldClass}
            />
            <span aria-hidden="true" className={euroClass}>
              €
            </span>
          </label>
          <span aria-hidden="true" className="text-fg-muted">
            –
          </span>
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Precio máximo (€)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Máx."
              min={bounds.min}
              max={bounds.max}
              step={1}
              value={hiText}
              data-testid="price-max"
              onChange={(event) => setHiText(event.target.value)}
              onBlur={() => commitText('hi')}
              onKeyDown={(event) => onTextKeyDown(event, 'hi')}
              className={fieldClass}
            />
            <span aria-hidden="true" className={euroClass}>
              €
            </span>
          </label>
        </div>

        {/* Intervalo: la barra resalta el tramo elegido; los dos `range` van encima (CSS en `globals.css`). */}
        <div className="relative mt-2 h-11" data-testid="price-slider">
          <div aria-hidden="true" className="absolute inset-x-5.5 inset-y-0">
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
            <div
              data-testid="price-range-fill"
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
              style={{ left: `${left}%`, right: `${right}%` }}
            />
          </div>
          <input
            type="range"
            aria-label="Precio mínimo (deslizador)"
            aria-valuetext={`${lo} €`}
            min={bounds.min}
            max={bounds.max}
            step={1}
            value={lo}
            data-testid="price-thumb-min"
            onChange={(event) => setValues(Math.min(Number(event.target.value), hi), hi)}
            onPointerUp={() => commit(lo, hi)}
            onKeyUp={onKeyUp}
            className={`price-range-input ${loOnTop ? 'z-20' : 'z-10'}`}
          />
          <input
            type="range"
            aria-label="Precio máximo (deslizador)"
            aria-valuetext={`${hi} €`}
            min={bounds.min}
            max={bounds.max}
            step={1}
            value={hi}
            data-testid="price-thumb-max"
            onChange={(event) => setValues(lo, Math.max(Number(event.target.value), lo))}
            onPointerUp={() => commit(lo, hi)}
            onKeyUp={onKeyUp}
            className={`price-range-input ${loOnTop ? 'z-10' : 'z-20'}`}
          />
        </div>
      </div>
    </fieldset>
  );
}
