import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetFavoriteResult } from '@/lib/favorites/actions';
import { FavoriteButton, FavoriteProvider } from './FavoriteButton';

// CA-76 y CA-77 (nivel de componente): nombre accesible, aria-pressed, destino sin sesión y reversión si falla. El flujo
// real con sesión, el retorno al acceso y la persistencia tras recargar los comprueban los e2e `favorites-*`.

const push = vi.fn();
const setFavorite = vi.fn<(productId: string, favorite: boolean) => Promise<SetFavoriteResult>>();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/favorites/actions', () => ({
  setFavoriteAction: (productId: string, favorite: boolean) => setFavorite(productId, favorite),
}));

const ID = '3f0e0b0e-2a4b-4c8e-9d2f-1a2b3c4d5e6f';

function mount(props: { signedIn: boolean; initialFavorite?: boolean }) {
  return render(
    <FavoriteProvider
      productId={ID}
      slug="polo-pique-basico"
      productName="Polo piqué básico"
      initialFavorite={props.initialFavorite ?? false}
      signedIn={props.signedIn}
    >
      <FavoriteButton />
      <FavoriteButton testId="favorite-button-sticky" />
    </FavoriteProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  setFavorite.mockReset();
});
afterEach(cleanup);

describe('FavoriteButton sin sesión (CA-76)', () => {
  it('es un enlace al acceso con retorno a la ficha y favorito=1', () => {
    mount({ signedIn: false });
    const link = screen.getByTestId('favorite-button');
    expect(link.tagName).toBe('A');
    const href = new URL(link.getAttribute('href') ?? '', 'http://x');
    expect(href.pathname).toBe('/acceso');
    expect(href.searchParams.get('siguiente')).toBe('/producto/polo-pique-basico?favorito=1');
    expect(link.getAttribute('aria-label')).toBe('Añadir a favoritos (inicia sesión)');
  });
});

describe('FavoriteButton con sesión (CA-77)', () => {
  it('el nombre accesible y aria-pressed informan del estado, no solo el color', () => {
    mount({ signedIn: true, initialFavorite: true });
    const button = screen.getByTestId('favorite-button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Quitar de favoritos');
  });

  it('al pulsar alterna, avisa en la región aria-live y sincroniza los dos corazones', async () => {
    setFavorite.mockResolvedValue({ status: 'ok', favorite: true });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByTestId('favorite-button'));
    });
    expect(setFavorite).toHaveBeenCalledWith(ID, true);
    expect(screen.getByTestId('favorite-button-sticky').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('favorite-status').textContent).toBe('Polo piqué básico añadido a favoritos.');

    setFavorite.mockResolvedValue({ status: 'ok', favorite: false });
    await act(async () => {
      fireEvent.click(screen.getByTestId('favorite-button-sticky'));
    });
    expect(setFavorite).toHaveBeenLastCalledWith(ID, false);
    expect(screen.getByTestId('favorite-button').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('favorite-status').textContent).toBe('Polo piqué básico quitado de favoritos.');
  });

  it('si falla, revierte y lo avisa', async () => {
    setFavorite.mockResolvedValue({ status: 'error' });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByTestId('favorite-button'));
    });
    expect(screen.getByTestId('favorite-button').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('favorite-status').textContent).toContain('No se ha podido');
  });

  it('si la sesión caducó, revierte y lleva al acceso con retorno a la ficha', async () => {
    setFavorite.mockResolvedValue({ status: 'unauthenticated' });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByTestId('favorite-button'));
    });
    expect(screen.getByTestId('favorite-button').getAttribute('aria-pressed')).toBe('false');
    expect(push).toHaveBeenCalledWith(`/acceso?siguiente=${encodeURIComponent('/producto/polo-pique-basico?favorito=1')}`);
  });
});
