import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComingSoon } from './ComingSoon';

// CA-10 y CA-11 (T-103, T-104): pantalla informativa, sin formularios ni cifras.
afterEach(cleanup);

describe('ComingSoon', () => {
  it('muestra el título, «Próximamente» y el texto, sin formularios, botones ni cifras', () => {
    const { container } = render(<ComingSoon title="Trama Club" description="Texto de prueba sin números." />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trama Club' })).toBeTruthy();
    expect(screen.getByText('Próximamente')).toBeTruthy();
    expect(screen.getByText('Texto de prueba sin números.')).toBeTruthy();
    expect(container.querySelector('form, input, button, a')).toBeNull();
    expect(container.textContent).not.toMatch(/\d/);
  });
});
