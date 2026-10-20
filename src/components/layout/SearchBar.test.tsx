import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUGGEST_DEBOUNCE_MS, SearchBar } from './SearchBar';

// CA-107 y CA-108 (nivel de componente): espera de 300 ms, mínimo de 2 caracteres, ARIA y teclado. La integración con
// la API real, la pantalla completa en móvil y el foco los comprueba el e2e `search-typeahead`.

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const HITS = [
  { id: '1', slug: 'abrigo-pano-gris', name: 'Abrigo de paño gris', priceCents: 8990, image: { path: '/images/products/a.webp', alt: 'Abrigo' } },
  { id: '2', slug: 'abrigo-largo-camel', name: 'Abrigo largo camel', priceCents: 9990, image: null },
];

const fetchMock = vi.fn();

async function type(value: string): Promise<void> {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SUGGEST_DEBOUNCE_MS);
  });
}

function respondWith(body: unknown, ok = true): void {
  fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  push.mockReset();
  fetchMock.mockReset();
  respondWith(HITS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SearchBar: petición', () => {
  it('no pide nada con menos de 2 caracteres', async () => {
    render(<SearchBar variant="inline" />);
    await type('a');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
  });

  it('espera 300 ms tras la última tecla y pide una sola vez con el texto codificado', async () => {
    render(<SearchBar variant="inline" />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ab' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUGGEST_DEBOUNCE_MS - 1);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'abr é' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SUGGEST_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/search?q=abr%20%C3%A9');
  });
});

describe('SearchBar: resultados', () => {
  it('muestra las sugerencias con nombre y precio, y «Ver todos los resultados» al final', async () => {
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]?.textContent).toContain('Abrigo de paño gris');
    expect(options[0]?.textContent).toContain('89,90');
    expect(options[0]?.getAttribute('href')).toBe('/producto/abrigo-pano-gris');
    expect(options[2]?.textContent).toBe('Ver todos los resultados para «abrigo»');
    expect(options[2]?.getAttribute('href')).toBe('/buscar?q=abrigo');
  });

  it('sin resultados dice «No encontramos nada, prueba con otra palabra»', async () => {
    respondWith([]);
    render(<SearchBar variant="inline" />);
    await type('zzzz');
    expect(screen.getByText('No encontramos nada, prueba con otra palabra')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
  });

  it('un fallo de la API muestra un aviso y no rompe el campo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    respondWith({ error: 'x' }, false);
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    expect(screen.getByRole('alert').textContent).toContain('No se pudo buscar');
    log.mockRestore();
  });

  it('una respuesta con otra forma se rechaza con Zod (aviso, sin sugerencias)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    respondWith([{ id: 1 }]);
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('alert')).toBeTruthy();
    log.mockRestore();
  });
});

describe('SearchBar: ARIA y teclado', () => {
  it('es un combobox con aria-expanded, aria-controls y aria-autocomplete', async () => {
    render(<SearchBar variant="inline" />);
    const input = screen.getByRole('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    const controls = input.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    await type('abrigo');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(controls ?? '')?.getAttribute('role')).toBe('listbox');
  });

  it('las flechas cambian aria-activedescendant e Intro abre la opción activa', async () => {
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    const input = screen.getByRole('combobox');
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1]?.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/producto/abrigo-largo-camel');
  });

  it('ArrowUp desde ninguna opción va a la última («Ver todos»)', async () => {
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(options.at(-1)?.id);
  });

  it('Esc cierra la lista y no se propaga al panel', async () => {
    const onKeyDown = vi.fn();
    render(
      <div onKeyDown={onKeyDown}>
        <SearchBar variant="overlay" />
      </div>,
    );
    await type('abrigo');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('Intro sin opción activa busca en /buscar con el texto normalizado', async () => {
    render(<SearchBar variant="inline" />);
    await type('  abrigo   largo ');
    fireEvent.submit(screen.getByRole('search'));
    expect(push).toHaveBeenCalledWith('/buscar?q=abrigo%20largo');
  });

  it('avisa a los lectores de pantalla del número de sugerencias', async () => {
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    const live = document.querySelector('p[aria-live="polite"]');
    expect(live?.textContent).toBe('2 sugerencias');
  });

  it('en pantalla completa lleva el botón «Buscar» y llama a onNavigate al buscar', async () => {
    const onNavigate = vi.fn();
    render(<SearchBar variant="overlay" onNavigate={onNavigate} />);
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeTruthy();
    await type('abrigo');
    fireEvent.submit(screen.getByRole('search'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('las opciones no se alcanzan con Tab (el foco se queda en el campo)', async () => {
    render(<SearchBar variant="inline" />);
    await type('abrigo');
    for (const option of screen.getAllByRole('option')) expect(option.getAttribute('tabindex')).toBe('-1');
  });
});
