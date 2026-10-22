import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import { ProductCard } from './ProductCard';
import { QuickAdd } from './QuickAdd';

// CA-120 (T-077, nivel de componente): tallas, tachado de las agotadas y botón desactivado hasta elegir. El hover real, el
// carrito y el umbral por ancho los comprueba el e2e `catalog-quick-add`.

vi.mock('@/components/cart/AddToCartButton', () => ({
  AddToCartButton: ({
    testId,
    variantId,
    label,
    fullWidth,
  }: {
    testId?: string;
    variantId: string | null;
    label?: string;
    fullWidth?: boolean;
  }) => (
    <button type="button" data-testid={testId} data-full={String(Boolean(fullWidth))} disabled={variantId === null}>
      {label}
    </button>
  ),
}));

afterEach(cleanup);

const sizes = [
  { variantId: 'a', size: 'S', stock: 0 },
  { variantId: 'b', size: 'M', stock: 3 },
  { variantId: 'c', size: 'L', stock: 5 },
  { variantId: 'd', size: 'XL', stock: 0 },
];

function panel(moreColors = 0) {
  return render(
    <article className="group">
      <QuickAdd productName="Polo demo" sizes={sizes} moreColors={moreColors} signedIn={false} />
    </article>,
  );
}

describe('QuickAdd', () => {
  it('muestra todas las tallas en 4 columnas, con las agotadas desactivadas, tachadas y con opacity-40', () => {
    panel();
    expect(screen.getByRole('group', { name: 'Talla de Polo demo' }).className).toContain('grid-cols-4');
    const buttons = screen.getAllByTestId('quick-add-size');
    expect(buttons.map((b) => b.textContent)).toEqual(['S', 'M', 'L', 'XL']);
    for (const index of [0, 3]) {
      const sold = buttons[index];
      expect(sold).toBeDisabled();
      expect(sold?.className).toContain('disabled:line-through');
      expect(sold?.className).toContain('disabled:opacity-40');
      expect(sold?.className).toContain('disabled:cursor-not-allowed');
      expect(sold?.getAttribute('aria-label')).toBe(`Talla ${index === 0 ? 'S' : 'XL'}, agotada`);
    }
    expect(buttons[1]).toBeEnabled();
  });

  it('elegir una talla la marca (aria-pressed) y desmarca la anterior; las agotadas no se eligen', () => {
    panel();
    const [, m, l, xl] = screen.getAllByTestId('quick-add-size');
    fireEvent.click(m as HTMLElement);
    expect(m).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(l as HTMLElement);
    expect(l).toHaveAttribute('aria-pressed', 'true');
    expect(m).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(xl as HTMLElement);
    expect(xl).toHaveAttribute('aria-pressed', 'false');
  });

  it('el botón «Añadir a la cesta» ocupa todo el ancho y está desactivado hasta elegir talla', () => {
    panel();
    const button = screen.getByTestId('quick-add-button');
    expect(button.textContent).toBe('Añadir a la cesta');
    expect(button).toBeDisabled();
    expect(button.getAttribute('data-full')).toBe('true');
    fireEvent.click(screen.getAllByTestId('quick-add-size')[1] as HTMLElement);
    expect(screen.getByTestId('quick-add-button')).toBeEnabled();
  });

  it('avisa de los colores que hay en la ficha', () => {
    panel(2);
    expect(screen.getByText('+2 colores en la ficha')).toBeInTheDocument();
    cleanup();
    panel(1);
    expect(screen.getByText('+1 color en la ficha')).toBeInTheDocument();
  });

  it('Esc lo oculta (data-dismissed) y no se ve ni recibe pulsaciones sin hover ni foco: clases del encargo', () => {
    panel();
    const root = screen.getByTestId('quick-add');
    for (const cls of ['hidden', 'md:block', 'opacity-0', 'pointer-events-none', 'group-hover:opacity-100', 'group-focus-within:opacity-100', 'bg-surface/95', 'backdrop-blur-sm', 'duration-300', 'motion-reduce:transition-none', 'z-10']) {
      expect(root.className, cls).toContain(cls);
    }
    expect(root.getAttribute('data-dismissed')).toBe('false');
    fireEvent.keyDown(screen.getAllByTestId('quick-add-size')[1] as HTMLElement, { key: 'Escape' });
    expect(root.getAttribute('data-dismissed')).toBe('true');
  });
});

function product(variants: { id: string; size: string; color: string; stock: number }[]) {
  return toCatalogProduct(
    catalogRowSchema.parse({
      id: 'p1',
      slug: 'polo-demo',
      name: 'Polo demo',
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
      is_new: false,
      created_at: '2026-10-01T00:00:00Z',
      product_images: [{ path: '/products/polos-azul.svg', alt: 'Polo demo, color azul', position: 0 }],
      product_variants: variants.map((v) => ({ ...v, price_cents: 2990 })),
    }),
  );
}

describe('ProductCard y la compra rápida (CA-120)', () => {
  it('sin la propiedad quickAdd (portada, búsqueda) no hay panel', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} />);
    expect(screen.queryByTestId('quick-add')).toBeNull();
  });

  it('con quickAdd y stock lleva el panel dentro de la imagen', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.getByTestId('quick-add')).toBeInTheDocument();
  });

  it('una prenda agotada no tiene panel', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 0 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.queryByTestId('quick-add')).toBeNull();
  });
});
