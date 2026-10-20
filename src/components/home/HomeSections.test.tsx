import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopBar } from '../layout/TopBar';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import { FREE_SHIPPING_THRESHOLD_CENTS, formatEuros } from '@/lib/domain/shop';
import { ColdWeatherSection } from './ColdWeatherSection';
import { ExploreSection } from './ExploreSection';
import { NEW_ARRIVALS_LIMIT, NewArrivalsView } from './NewArrivals';
import { ShippingBanner } from './ShippingBanner';

// CA-81, CA-83, CA-94, CA-98 y CA-85 (nivel de componente). El e2e `top-bar` y `home-sections` los comprueban en el navegador.

function product(index: number) {
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: `p${index}`,
      slug: `producto-${index}`,
      name: `Producto ${index}`,
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: true,
      created_at: '2026-10-01T00:00:00Z',
      product_images: [],
      product_variants: [{ id: `v${index}`, size: 'M', color: 'negro', price_cents: 2990, stock: 5 }],
    }),
  );
}

describe('TopBar (CA-81, CA-94)', () => {
  it('muestra la colección y el umbral de la constante de la tienda, nunca un importe a mano', () => {
    render(<TopBar />);
    const bar = screen.getByTestId('top-bar');
    expect(bar.textContent).toContain(`Envío gratis a partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}`);
    expect(bar.textContent).toContain('Nueva colección Otoño/Invierno ya disponible');
    expect(bar.textContent).not.toContain('49,99');
  });

  it('usa solo tokens: fondo accent y texto accent-fg', () => {
    render(<TopBar />);
    const classes = screen.getByTestId('top-bar').className;
    expect(classes).toContain('bg-accent');
    expect(classes).toContain('text-accent-fg');
    expect(classes).not.toMatch(/\[[^\]]+\]/);
  });
});

describe('ExploreSection (CA-83)', () => {
  it('tiene cuatro accesos con enlace válido, imagen decorativa y nombre accesible', () => {
    render(<ExploreSection />);
    const links = screen.getAllByTestId('explore-tile');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/mujer', '/hombre', '/novedades', '/ofertas']);
    expect(links.map((link) => link.textContent)).toEqual(['Mujer', 'Hombre', 'Novedades', 'Ofertas']);
    for (const link of links) expect(within(link).getByRole('presentation', { hidden: true }).getAttribute('alt')).toBe('');
  });
});

describe('ShippingBanner (CA-98)', () => {
  it('dice el umbral real de envío gratis, no un importe a mano', () => {
    render(<ShippingBanner />);
    expect(screen.getByTestId('shipping-banner-text').textContent).toBe(
      `Envío gratis a partir de ${formatEuros(FREE_SHIPPING_THRESHOLD_CENTS)}`,
    );
    expect(screen.getByTestId('shipping-banner').textContent).not.toContain('49,99');
  });

  it('lleva la foto decorativa de fondo y un velo oscuro con tokens (fg), sin negro ni valores arbitrarios', () => {
    const { container } = render(<ShippingBanner />);
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    const veil = container.querySelector('div[aria-hidden="true"]');
    expect(veil?.className).toContain('bg-fg/70');
    const classes = screen.getByTestId('shipping-banner').className + (veil?.className ?? '');
    expect(classes).not.toMatch(/black|\[[^\]]+\]/);
  });

  it('mide 224 px en móvil y 320 px desde md (h-56 y md:h-80)', () => {
    render(<ShippingBanner />);
    const classes = screen.getByTestId('shipping-banner').className;
    expect(classes).toContain('h-56');
    expect(classes).toContain('md:h-80');
  });
});

describe('NewArrivalsView (CA-85)', () => {
  it('no muestra nada sin novedades', () => {
    const { container } = render(<NewArrivalsView products={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('muestra las novedades con la tarjeta del catálogo y «Ver todo» a /novedades', () => {
    render(<NewArrivalsView products={[product(1), product(2), product(3)]} />);
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Ver todo' }).getAttribute('href')).toBe('/novedades');
    expect(screen.getByRole('heading', { level: 2, name: 'Novedades' })).toBeTruthy();
  });

  it('el máximo de novedades es 8', () => {
    expect(NEW_ARRIVALS_LIMIT).toBe(8);
  });
});

describe('ColdWeatherSection (CA-116)', () => {
  it('tiene el título y cuatro tarjetas con enlace a su categoría', () => {
    render(<ColdWeatherSection />);
    expect(screen.getByRole('heading', { level: 2, name: 'Prepárate para el frío' })).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Abrigos', '/mujer?categoria=abrigos'],
      ['Jerséis', '/mujer?categoria=jerseis'],
      ['Chaquetas', '/hombre?categoria=chaquetas'],
      ['Sudaderas', '/hombre?categoria=sudaderas'],
    ]);
  });

  it('las fotos son decorativas y el degradado usa tokens (fg), no valores arbitrarios', () => {
    const { container } = render(<ColdWeatherSection />);
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('');
    const gradient = container.querySelector('span[aria-hidden="true"]');
    expect(gradient?.className).toContain('from-fg/90');
    expect(gradient?.className).not.toMatch(/black|\[[^\]]+\]/);
  });
});
