import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogError } from './CatalogError';
import { CatalogSkeleton } from './CatalogSkeleton';

describe('CatalogSkeleton (estado de carga)', () => {
  it('anuncia la carga a los lectores de pantalla', () => {
    render(<CatalogSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos');
  });

  it('solo anima si el usuario no pidió reducir el movimiento', () => {
    const { container } = render(<CatalogSkeleton />);
    for (const element of container.querySelectorAll('[class*="animate-pulse"]')) {
      expect(element.className).toContain('motion-safe:animate-pulse');
    }
  });
});

describe('CatalogError (estado de error)', () => {
  it('muestra un mensaje y es una alerta', () => {
    render(<CatalogError reset={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No hemos podido cargar los productos');
  });

  it('el botón Reintentar llama a reset', () => {
    const reset = vi.fn();
    render(<CatalogError reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('ofrece volver al inicio', () => {
    render(<CatalogError reset={() => undefined} />);
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
