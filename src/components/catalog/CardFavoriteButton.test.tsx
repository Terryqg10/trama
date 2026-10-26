import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetFavoriteResult } from '@/lib/favorites/actions';
import { CardFavoriteButton } from './CardFavoriteButton';

// CA-147 (nivel de componente): nombre accesible, aria-pressed, destino sin sesión con retorno al listado y reversión
// si falla. El flujo real y el no abrir la ficha los comprueba el e2e `card-favorites`.

const push = vi.fn();
const setFavorite = vi.fn<(productId: string, favorite: boolean) => Promise<SetFavoriteResult>>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/hombre',
  useSearchParams: () => new URLSearchParams('categoria=polos'),
}));
vi.mock('@/lib/favorites/actions', () => ({
  setFavoriteAction: (productId: string, favorite: boolean) => setFavorite(productId, favorite),
}));

const ID = '3f0e0b0e-2a4b-4c8e-9d2f-1a2b3c4d5e6f';

function mount(props: { signedIn: boolean; initialFavorite?: boolean }) {
  return render(
    <CardFavoriteButton
      productId={ID}
      productName="Polo piqué básico"
      signedIn={props.signedIn}
      initialFavorite={props.initialFavorite ?? false}
    />,
  );
}

beforeEach(() => {
  push.mockReset();
  setFavorite.mockReset();
});
afterEach(cleanup);

describe('CardFavoriteButton sin sesión (CA-147)', () => {
  it('es un enlace al acceso con retorno al listado actual con sus filtros', () => {
    mount({ signedIn: false });
    const link = screen.getByRole('link', { name: 'Añadir Polo piqué básico a favoritos (inicia sesión)' });
    const href = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(href.pathname).toBe('/acceso');
    expect(href.searchParams.get('siguiente')).toBe('/hombre?categoria=polos');
  });
});

describe('CardFavoriteButton con sesión (CA-147)', () => {
  it('parte de aria-pressed según el favorito inicial y lleva el nombre del producto', () => {
    mount({ signedIn: true, initialFavorite: true });
    const button = screen.getByRole('button', { name: 'Quitar Polo piqué básico de favoritos' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('marca y avisa con aria-live', async () => {
    setFavorite.mockResolvedValue({ status: 'ok', favorite: true });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Añadir Polo piqué básico a favoritos' }));
    });
    expect(setFavorite).toHaveBeenCalledWith(ID, true);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Polo piqué básico añadido a favoritos.')).toBeTruthy();
  });

  it('revierte y avisa si falla', async () => {
    setFavorite.mockResolvedValue({ status: 'error' });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('No se ha podido actualizar tus favoritos. Inténtalo de nuevo.')).toBeTruthy();
  });

  it('con la sesión caducada lleva al acceso con retorno al listado', async () => {
    setFavorite.mockResolvedValue({ status: 'unauthenticated' });
    mount({ signedIn: true });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(push).toHaveBeenCalledWith(`/acceso?siguiente=${encodeURIComponent('/hombre?categoria=polos')}`);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });
});
