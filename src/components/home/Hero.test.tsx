import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HERO_ALT, Hero } from './Hero';

// CA-69 y CA-82 (nivel de componente): una sola imagen con foto vertical por defecto y horizontal desde md, con AVIF
// y WebP, texto alternativo y un CTA con destino válido. El ancho completo, el contraste y el cambio real de imagen
// por ancho los comprueba el e2e `home-hero`.

describe('Hero (CA-69, CA-82)', () => {
  it('muestra «Nueva colección», el titular y el CTA al catálogo de novedades', () => {
    render(<Hero />);
    expect(screen.getByText('Nueva colección')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Estilo urbano' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver colección' }).getAttribute('href')).toBe('/novedades');
  });

  it('tiene un único h1', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('usa la foto vertical por defecto y la horizontal desde 768 px, en AVIF con WebP de respaldo', () => {
    const { container } = render(<Hero />);
    const sources = Array.from(container.querySelectorAll('picture > source')).map((s) => ({
      media: s.getAttribute('media'),
      type: s.getAttribute('type'),
      srcset: s.getAttribute('srcset'),
    }));
    expect(sources).toEqual([
      { media: '(min-width: 768px)', type: 'image/avif', srcset: '/images/hero/hero-pareja-horizontal.avif' },
      { media: '(min-width: 768px)', type: 'image/webp', srcset: '/images/hero/hero-pareja-horizontal.webp' },
      { media: null, type: 'image/avif', srcset: '/images/hero/hero-pareja-vertical.avif' },
      { media: null, type: 'image/webp', srcset: '/images/hero/hero-pareja-vertical.webp' },
    ]);
    const img = container.querySelector('picture > img');
    expect(img?.getAttribute('src')).toBe('/images/hero/hero-pareja-vertical.webp');
    expect(img?.getAttribute('alt')).toBe(HERO_ALT);
    expect(HERO_ALT.trim().length).toBeGreaterThan(0);
  });

  it('la imagen LCP carga con prioridad alta y sin lazy', () => {
    const { container } = render(<Hero />);
    const img = container.querySelector('picture > img');
    expect(img?.getAttribute('fetchpriority')).toBe('high');
    expect(img?.getAttribute('loading')).toBe('eager');
  });

  it('el degradado usa tokens (fg) y no el negro de Tailwind ni valores arbitrarios', () => {
    const { container } = render(<Hero />);
    const gradient = container.querySelector('section > div[aria-hidden="true"]');
    expect(gradient?.className).toContain('from-fg/80');
    expect(gradient?.className).not.toContain('black');
    expect(gradient?.className).not.toMatch(/\[[^\]]+\]/);
  });
});
