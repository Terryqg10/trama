import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { productDetailRowSchema, toProductDetail } from '@/lib/catalog/product';
import { resolveSelection } from '@/lib/catalog/variant-selection';
import { VariantSelector } from './VariantSelector';

// SPEC-001 CA-03 (test componente `variant-stock`): una talla sin stock se muestra deshabilitada y
// no se puede elegir.

function renderSelector(raw: Record<string, string>) {
  const product = toProductDetail(
    productDetailRowSchema.parse({
      id: 'p1',
      slug: 'polo-demo',
      name: 'Polo demo',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: '2026-10-01T00:00:00Z',
      description: null,
      composition: null,
      care: null,
      model_height_cm: null,
      model_size: null,
      product_images: [{ path: '/products/polos-azul.svg', alt: 'Polo demo, color azul', position: 0 }],
      product_variants: [
        { id: 'v1', size: 'S', color: 'azul', price_cents: 2990, stock: 5 },
        { id: 'v2', size: 'M', color: 'azul', price_cents: 2990, stock: 0 },
        { id: 'v3', size: 'L', color: 'azul', price_cents: 2990, stock: 5 },
        { id: 'v4', size: 'S', color: 'negro', price_cents: 2990, stock: 5 },
      ],
    }),
  );
  render(<VariantSelector slug={product.slug} selection={resolveSelection(product, raw)} />);
}

describe('VariantSelector: stock de tallas (CA-03)', () => {
  it('una talla sin stock está deshabilitada y no es un enlace', () => {
    renderSelector({ color: 'azul' });
    const talla = screen.getByRole('group', { name: /Talla/ });
    expect(within(talla).queryByRole('link', { name: 'M' })).toBeNull();
    const disabled = within(talla).getByText('M', { selector: '[aria-disabled="true"]' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
  });

  it('una talla sin stock se anuncia como agotada a los lectores de pantalla', () => {
    renderSelector({ color: 'azul' });
    expect(screen.getByText('(agotada)')).toBeInTheDocument();
  });

  it('las tallas con stock son enlaces a la misma ficha con ?color= y ?talla=', () => {
    renderSelector({ color: 'azul' });
    const talla = screen.getByRole('group', { name: /Talla/ });
    const link = within(talla).getByRole('link', { name: 'L' });
    expect(link.getAttribute('href')).toContain('/producto/polo-demo');
    expect(link.getAttribute('href')).toContain('talla=L');
    expect(link.getAttribute('href')).toContain('color=azul');
  });

  it('intentar elegir por URL una talla sin stock no la selecciona', () => {
    renderSelector({ color: 'azul', talla: 'M' });
    const talla = screen.getByRole('group', { name: /Talla/ });
    expect(within(talla).queryByRole('link', { current: 'true' })).toBeNull();
    expect(screen.getByText('Elige una talla para ver la disponibilidad.')).toBeInTheDocument();
  });

  it('la talla elegida se marca con aria-current y muestra la disponibilidad y el precio', () => {
    renderSelector({ color: 'azul', talla: 'L' });
    const talla = screen.getByRole('group', { name: /Talla/ });
    expect(within(talla).getByRole('link', { name: 'L' })).toHaveAttribute('aria-current', 'true');
    const status = screen.getByTestId('variant-status');
    expect(status).toHaveTextContent('En stock');
    expect(status).toHaveTextContent('IVA incluido');
  });
});

describe('VariantSelector: color', () => {
  it('el color elegido se marca con aria-current y los demás son enlaces', () => {
    renderSelector({});
    const color = screen.getByRole('group', { name: /Color/ });
    expect(within(color).getByRole('link', { name: 'Azul' })).toHaveAttribute('aria-current', 'true');
    const negro = within(color).getByRole('link', { name: 'Negro' });
    expect(negro).not.toHaveAttribute('aria-current');
    expect(negro.getAttribute('href')).toContain('color=negro');
  });

  it('al cambiar de color no se arrastra la talla (depende del color)', () => {
    renderSelector({ color: 'azul', talla: 'L' });
    const color = screen.getByRole('group', { name: /Color/ });
    expect(within(color).getByRole('link', { name: 'Negro' }).getAttribute('href')).not.toContain('talla=');
  });
});
