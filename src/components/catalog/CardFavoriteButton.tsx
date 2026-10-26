'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setFavoriteAction } from '@/lib/favorites/actions';

const buttonClass =
  'absolute right-3 top-3 z-10 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-card hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Corazón de la tarjeta del listado (CA-147, T-115). Con sesión alterna con actualización optimista y reversión si
 * falla; sin sesión es un enlace al acceso que vuelve al listado actual (con sus filtros). Va por encima del enlace
 * extendido de la tarjeta (`z-10`), así que pulsarlo no abre la ficha.
 */
export function CardFavoriteButton({
  productId,
  productName,
  signedIn,
  initialFavorite,
}: {
  readonly productId: string;
  readonly productName: string;
  readonly signedIn: boolean;
  readonly initialFavorite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const here = search === '' ? pathname : `${pathname}?${search}`;

  if (!signedIn) {
    return (
      <Link
        href={{ pathname: '/acceso', query: { siguiente: here } }}
        data-testid="card-favorite"
        aria-label={`Añadir ${productName} a favoritos (inicia sesión)`}
        className={buttonClass}
      >
        <Heart aria-hidden="true" className="size-5" />
      </Link>
    );
  }

  function toggle(): void {
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
        router.push(`/acceso?siguiente=${encodeURIComponent(here)}`);
        return;
      }
      setMessage('No se ha podido actualizar tus favoritos. Inténtalo de nuevo.');
    });
  }

  return (
    <>
      <button
        type="button"
        data-testid="card-favorite"
        aria-pressed={favorite}
        aria-label={favorite ? `Quitar ${productName} de favoritos` : `Añadir ${productName} a favoritos`}
        onClick={toggle}
        className={buttonClass}
      >
        <Heart aria-hidden="true" className={`size-5 ${favorite ? 'fill-current text-accent-text' : ''}`} />
      </button>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </>
  );
}
