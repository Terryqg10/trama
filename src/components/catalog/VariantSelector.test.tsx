import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { productDetailRowSchema, toProductDetail } from '@/lib/catalog/product';
import { resolveSelection } from '@/lib/catalog/variant-selection';
import { VariantSelector } from './VariantSelector';

// SPEC-001 CA-03 (test componente `variant-stock`): una talla sin stock se muestra deshabilitada y
// no se puede elegir.

function renderSelector(raw: Record<string, string>, colors: readonly string[] = ['azul', 'negro']) {
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
        ...colors
          .filter((color) => color !== 'azul')
          .map((color, index) => ({
            id: `c${index}`,
            size: 'S',
            color,
            price_cents: 2990,
            stock: 5,
          })),
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

// SPEC-001 Enmienda 12 (CA-57 y CA-58, test `color-swatches`): círculos de color con token.
describe('VariantSelector: círculos de color (CA-57)', () => {
  it('cada color es un enlace con su nombre accesible y un círculo con la clase de su token', () => {
    renderSelector({});
    const color = screen.getByRole('group', { name: /Color/ });
    const azul = within(color).getByRole('link', { name: 'Azul' });
    const negro = within(color).getByRole('link', { name: 'Negro' });
    expect(azul.querySelector('.bg-swatch-azul')).not.toBeNull();
    expect(negro.querySelector('.bg-swatch-negro')).not.toBeNull();
  });

  it('el círculo es decorativo (aria-hidden) y el nombre llega como texto para lectores de pantalla', () => {
    renderSelector({});
    const azul = within(screen.getByRole('group', { name: /Color/ })).getByRole('link', { name: 'Azul' });
    expect(azul.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(azul.querySelector('.sr-only')).toHaveTextContent('Azul');
    expect(azul).toHaveAttribute('title', 'Azul');
  });

  it('el color elegido lleva aria-current y un anillo; los demás, no', () => {
    renderSelector({ color: 'negro' });
    const color = screen.getByRole('group', { name: /Color/ });
    const negro = within(color).getByRole('link', { name: 'Negro' });
    const azul = within(color).getByRole('link', { name: 'Azul' });
    expect(negro).toHaveAttribute('aria-current', 'true');
    expect(negro.querySelector('.ring-2')).not.toBeNull();
    expect(azul).not.toHaveAttribute('aria-current');
    expect(azul.querySelector('.ring-2')).toBeNull();
  });

  it('el subtexto muestra el nombre del color elegido, también el preseleccionado', () => {
    renderSelector({});
    expect(screen.getByText('Azul', { selector: 'p span' })).toBeInTheDocument();
  });

  it('el subtexto cambia con el color elegido', () => {
    renderSelector({ color: 'negro' });
    expect(screen.getByText('Negro', { selector: 'p span' })).toBeInTheDocument();
    expect(screen.queryByText('Azul', { selector: 'p span' })).not.toBeInTheDocument();
  });

  it('los círculos son enlaces a la misma ficha con ?color=', () => {
    renderSelector({});
    const negro = within(screen.getByRole('group', { name: /Color/ })).getByRole('link', { name: 'Negro' });
    expect(negro.getAttribute('href')).toContain('/producto/polo-demo');
    expect(negro.getAttribute('href')).toContain('color=negro');
  });

  it('un color de la fila de tallas no se pinta como círculo (las tallas siguen siendo texto)', () => {
    renderSelector({ color: 'azul' });
    const talla = screen.getByRole('group', { name: /Talla/ });
    expect(talla.querySelector('[class*="bg-swatch"]')).toBeNull();
  });
});

describe('VariantSelector: color sin token (CA-58)', () => {
  it('se muestra como chip de texto, no como círculo de otro color', () => {
    renderSelector({}, ['azul', 'turquesa']);
    const color = screen.getByRole('group', { name: /Color/ });
    const turquesa = within(color).getByRole('link', { name: 'Turquesa' });
    expect(turquesa.querySelector('[class*="bg-swatch"]')).toBeNull();
    expect(turquesa).toHaveTextContent('Turquesa');
    expect(turquesa).not.toHaveAttribute('data-swatch');
  });

  it('los colores con token siguen siendo círculos al lado de uno sin token', () => {
    renderSelector({}, ['azul', 'turquesa']);
    const color = screen.getByRole('group', { name: /Color/ });
    expect(within(color).getByRole('link', { name: 'Azul' }).querySelector('.bg-swatch-azul')).not.toBeNull();
  });

  it('el color sin token elegido muestra el subtexto y la marca de elegido', () => {
    renderSelector({ color: 'turquesa' }, ['azul', 'turquesa']);
    const color = screen.getByRole('group', { name: /Color/ });
    expect(within(color).getByRole('link', { name: 'Turquesa' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Turquesa', { selector: 'p span' })).toBeInTheDocument();
  });
});
