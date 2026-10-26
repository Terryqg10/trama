import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PasswordStrength } from './PasswordStrength';

// CA-155 (T-123, nivel de componente): nivel, etiqueta de texto, `aria-live` y tokens del estilo. La integración en los formularios y
// los anchos los comprueba el e2e `auth`.

afterEach(cleanup);

describe('PasswordStrength (CA-155)', () => {
  it('con el campo vacío no se ve nada: solo queda la región aria-live oculta y vacía', () => {
    const { container } = render(<PasswordStrength password="" />);
    const root = screen.getByTestId('password-strength');
    expect(root.className).toContain('sr-only');
    expect(root.getAttribute('data-level')).toBe('vacio');
    expect(container.querySelector('[aria-live]')?.textContent).toBe('');
    expect(container.querySelector('[aria-hidden="true"] > div')).toBeNull();
  });

  it.each([
    ['abc', 'debil', 'Contraseña débil', 'bg-danger', 'w-1/3'],
    ['abcdefg1', 'buena', 'Contraseña buena', 'bg-accent', 'w-2/3'],
    ['Una-Contraseña-Larga-2026!', 'fuerte', 'Contraseña fuerte', 'bg-success', 'w-full'],
  ])('«%s» es %s: etiqueta de texto, barra con token y anuncio educado', (password, level, label, color, width) => {
    const { container } = render(<PasswordStrength password={password} />);
    const root = screen.getByTestId('password-strength');
    expect(root.getAttribute('data-level')).toBe(level);
    expect(root.className).not.toContain('sr-only');
    const live = container.querySelector('[aria-live]');
    expect(live?.textContent).toBe(label);
    expect(live?.getAttribute('aria-live')).toBe('polite');
    const bar = container.querySelector('[aria-hidden="true"] > div');
    expect(bar?.className).toContain(color);
    expect(bar?.className).toContain(width);
  });

  it('no usa role="status" (en Trama marca cargas y resultados de formulario)', () => {
    render(<PasswordStrength password="abc" />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('solo usa tokens del estilo: ni colores genéricos de Tailwind ni valores arbitrarios', () => {
    for (const password of ['abc', 'abcdefg1', 'Una-Contraseña-Larga-2026!']) {
      const { container, unmount } = render(<PasswordStrength password={password} />);
      expect(container.innerHTML).not.toMatch(/(?:red|yellow|green|black|white|gray)-\d{2,3}|bg-black|\[\d+/);
      unmount();
    }
  });
});
