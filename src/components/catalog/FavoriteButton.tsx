'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from 'react';
import { setFavoriteAction } from '@/lib/favorites/actions';

/**
 * Favoritos de la ficha (RF-24, CA-76, CA-77, T-042). El estado vive en un contexto para que el corazón de la ficha y el
 * de la barra fija de móvil estén siempre sincronizados y compartan un único aviso `aria-live`. Con sesión alterna con
 * actualización optimista y reversión si falla; sin sesión el corazón es un enlace al acceso con retorno a la ficha.
 */

interface FavoriteState {
  readonly slug: string;
  readonly signedIn: boolean;
  readonly favorite: boolean;
  readonly pending: boolean;
  readonly toggle: () => void;
}

const FavoriteContext = createContext<FavoriteState | null>(null);

export function FavoriteProvider({
  productId,
  slug,
  productName,
  initialFavorite,
  signedIn,
  children,
}: {
  readonly productId: string;
  readonly slug: string;
  readonly productName: string;
  readonly initialFavorite: boolean;
  readonly signedIn: boolean;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    if (pending) return;
    const wanted = !favorite;
    setFavorite(wanted);
    startTransition(async () => {
      const result = await setFavoriteAction(productId, wanted);
      if (result.status === 'ok') {
        setFavorite(result.favorite);
        setMessage(result.favorite ? `${productName} añadido a favoritos.` : `${productName} quitado de favoritos.`);
        return;
      }
      setFavorite(!wanted);
      if (result.status === 'unauthenticated') {
        router.push(`/acceso?siguiente=${encodeURIComponent(`/producto/${slug}?favorito=1`)}`);
        return;
      }
      setMessage('No se ha podido actualizar tus favoritos. Inténtalo de nuevo.');
    });
  }, [favorite, pending, productId, productName, router, slug]);

  return (
    <FavoriteContext.Provider value={{ slug, signedIn, favorite, pending, toggle }}>
      {children}
      <p data-testid="favorite-status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </FavoriteContext.Provider>
  );
}

const buttonClass =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-fg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Corazón de favoritos. Debe ir dentro de `FavoriteProvider`. */
export function FavoriteButton({ testId = 'favorite-button' }: { readonly testId?: string }) {
  const state = useContext(FavoriteContext);
  if (state === null) throw new Error('FavoriteButton necesita un FavoriteProvider');

  if (!state.signedIn) {
    return (
      <Link
        href={{ pathname: '/acceso', query: { siguiente: `/producto/${state.slug}?favorito=1` } }}
        data-testid={testId}
        aria-label="Añadir a favoritos (inicia sesión)"
        className={buttonClass}
      >
        <Heart aria-hidden="true" className="size-5" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={state.favorite}
      aria-label={state.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      onClick={state.toggle}
      className={buttonClass}
    >
      <Heart aria-hidden="true" className={`size-5 ${state.favorite ? 'fill-current text-accent-text' : ''}`} />
    </button>
  );
}
