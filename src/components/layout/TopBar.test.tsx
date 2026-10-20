import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';
import { ROTATE_MS, TopBar } from './TopBar';

// CA-110 (nivel de componente): rotación cada 4 s, pausa y alternativa estática. La transición real y el hover los
// comprueba el e2e `top-bar-rotation`.

const COLLECTION = 'Nueva colección Otoño/Invierno ya disponible';
const SHIPPING = `Envío gratis a partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}`;

class FakeIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// El estado se lee del atributo de la barra: en jsdom, `motion` no completa las salidas con el reloj simulado.
const current = () => screen.getByTestId('top-bar').getAttribute('data-message-index');
const visible = () => (current() === '0' ? COLLECTION : SHIPPING);

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TopBar rotativa (CA-110)', () => {
  it('empieza con la colección y a los 4 s pasa al envío gratis, y luego vuelve', async () => {
    render(<TopBar />);
    expect(visible()).toBe(COLLECTION);
    await advance(ROTATE_MS - 1);
    expect(visible()).toBe(COLLECTION);
    await advance(1);
    await advance(500);
    expect(visible()).toBe(SHIPPING);
    await advance(ROTATE_MS + 500);
    expect(visible()).toBe(COLLECTION);
  });

  it('el umbral sale de la constante de la tienda, nunca a mano', () => {
    render(<TopBar />);
    expect(screen.getByTestId('top-bar').textContent).toContain(SHIPPING);
    expect(screen.getByTestId('top-bar').textContent).not.toContain('49,99');
  });

  it('los dos textos están siempre para los lectores de pantalla y el rótulo animado va oculto', () => {
    render(<TopBar />);
    const text = screen.getByTestId('top-bar').textContent ?? '';
    expect(text).toContain(COLLECTION);
    expect(text).toContain(SHIPPING);
    expect(screen.getByTestId('top-bar-message').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('el botón de pausa detiene la rotación y el de reanudar la retoma', async () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar los mensajes de la barra' }));
    await advance(ROTATE_MS * 3);
    expect(visible()).toBe(COLLECTION);
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar los mensajes de la barra' }));
    await advance(ROTATE_MS + 500);
    expect(visible()).toBe(SHIPPING);
  });

  it('se detiene con el ratón encima y con el foco dentro, y un toque no la detiene', async () => {
    render(<TopBar />);
    const bar = screen.getByTestId('top-bar');
    fireEvent.pointerOver(bar);
    await advance(ROTATE_MS * 2);
    expect(visible()).toBe(COLLECTION);
    fireEvent.pointerOut(bar);
    const button = screen.getByRole('button');
    fireEvent.focus(button);
    await advance(ROTATE_MS * 2);
    expect(visible()).toBe(COLLECTION);
    fireEvent.blur(button, { relatedTarget: document.body });
    await advance(ROTATE_MS + 500);
    expect(visible()).toBe(SHIPPING);
  });

  it('el botón de pausa mide 44 px (size-11) y la barra al menos 44 px de alto', () => {
    render(<TopBar />);
    expect(screen.getByRole('button').className).toContain('size-11');
    expect(document.querySelector('[aria-hidden="true"]')?.className).toContain('h-11');
  });

  it('usa solo tokens: fondo accent y texto accent-fg', () => {
    render(<TopBar />);
    const classes = screen.getByTestId('top-bar').className;
    expect(classes).toContain('bg-accent');
    expect(classes).toContain('text-accent-fg');
    expect(classes).not.toMatch(/\[[^\]]+\]/);
  });
});

describe('TopBar con prefers-reduced-motion (CA-110)', () => {
  it('muestra los dos mensajes a la vez, sin rótulo animado ni botón, y no rota', async () => {
    setReducedMotion(true);
    render(<TopBar />);
    expect(screen.queryByTestId('top-bar-message')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    const text = screen.getByTestId('top-bar').textContent ?? '';
    expect(text).toContain(COLLECTION);
    expect(text).toContain(SHIPPING);
    await advance(ROTATE_MS * 3);
    expect(screen.getByTestId('top-bar').textContent).toContain(COLLECTION);
  });
});
