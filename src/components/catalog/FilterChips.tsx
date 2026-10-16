'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from 'react';

/**
 * Mejora progresiva del formulario de filtros (ADR-006). El `<form method="get">` lo
 * pinta el servidor y funciona sin JavaScript. Con JavaScript:
 * - un chip (radio) y el selector «Ordenar por» se aplican al instante, sin recargar el
 *   documento (RF-03, Enmienda 2 de SPEC-002);
 * - los campos de precio solo se aplican con «Aplicar filtros» o Enter (RF-04);
 * - los controles se sincronizan con la URL tras cada navegación («Limpiar», «Atrás»).
 */
export function FilterChips({
  action,
  testId,
  className,
  children,
}: {
  readonly action: Route;
  readonly testId: string;
  readonly className: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function apply(form: HTMLFormElement): void {
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === 'string' && value !== '') params.set(name, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${action}?${query}` : action, { scroll: false });
    });
  }

  function onChange(event: FormEvent<HTMLFormElement>): void {
    const target = event.target;
    const isChip = target instanceof HTMLInputElement && target.type === 'radio';
    const isSort = target instanceof HTMLSelectElement && target.name === 'orden';
    if (isChip || isSort) apply(event.currentTarget);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    apply(event.currentTarget);
  }

  // La URL manda: al cambiar (Limpiar, Atrás, otro chip) los controles se igualan a ella.
  const query = searchParams.toString();
  const syncedQuery = useRef(query);
  useEffect(() => {
    // En el montaje el servidor ya pintó el estado de la URL: tocarlo ahora borraría lo
    // que el usuario haya escrito antes de que la página terminara de hidratarse.
    if (syncedQuery.current === query) return;
    syncedQuery.current = query;
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams(query);

    const groups = new Map<string, HTMLInputElement[]>();
    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) continue;
      if (element instanceof HTMLInputElement && element.type === 'radio') {
        groups.set(element.name, [...(groups.get(element.name) ?? []), element]);
      } else if (element instanceof HTMLInputElement && element.type === 'number') {
        element.value = params.get(element.name) ?? '';
      } else if (element instanceof HTMLSelectElement) {
        const wanted = params.get(element.name);
        element.value = wanted !== null && Array.from(element.options).some((o) => o.value === wanted)
          ? wanted
          : (element.options[0]?.value ?? '');
      }
    }
    for (const [name, radios] of groups) {
      const wanted = params.get(name) ?? '';
      const match = radios.find((radio) => radio.value === wanted) ?? radios.find((r) => r.value === '');
      for (const radio of radios) radio.checked = radio === match;
    }
  }, [query]);

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      data-testid={testId}
      aria-busy={pending}
      onChange={onChange}
      onSubmit={onSubmit}
      className={`${className} ${pending ? 'opacity-60' : ''}`}
    >
      {children}
    </form>
  );
}
