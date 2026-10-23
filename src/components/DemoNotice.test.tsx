import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoNotice } from './DemoNotice';

// CA-140 (T-091, nivel de componente). La maquetación de 320 a 1280 px y axe los comprueba el e2e `demo-notice`.

function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DemoNotice (CA-140)', () => {
  it('es una nota con título y texto, sin botón si no hay nada que copiar', () => {
    render(<DemoNotice title="Tienda de demostración">Texto de ayuda</DemoNotice>);
    const note = screen.getByRole('note');
    expect(note.textContent).toContain('Tienda de demostración');
    expect(note.textContent).toContain('Texto de ayuda');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sin título solo muestra el texto', () => {
    render(<DemoNotice>Solo el texto</DemoNotice>);
    expect(screen.getByRole('note').textContent).toBe('Solo el texto');
  });

  it('el botón copia el valor, lo anuncia en la región aria-live y vuelve a su estado tras unos segundos', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(
      <DemoNotice copy={{ value: '4242 4242 4242 4242', label: 'Copiar número' }}>Usa la tarjeta de prueba</DemoNotice>,
    );
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar número' }));
    });
    expect(writeText).toHaveBeenCalledWith('4242 4242 4242 4242');
    expect(status.textContent).toBe('Copiado.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(status.textContent).toBe('');
  });

  it('si el portapapeles falla, lo dice sin lanzar y sin tapar el valor', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denegado')));
    render(<DemoNotice copy={{ value: 'x', label: 'Copiar' }}>Texto</DemoNotice>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    });
    expect(screen.getByRole('status').textContent).toContain('No se pudo copiar');
    expect(screen.getByRole('note').textContent).toContain('Texto');
  });

  it('el botón no envía formularios y mide 44 px', () => {
    render(
      <form>
        <DemoNotice copy={{ value: 'x', label: 'Copiar' }}>Texto</DemoNotice>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Copiar' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('min-h-11');
  });
});
