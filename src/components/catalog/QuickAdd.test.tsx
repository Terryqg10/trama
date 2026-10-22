import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import type { QuickAddColor } from '@/lib/catalog/quick-add';
import { ProductCard } from './ProductCard';
import { CardColorProvider, CardImage, QuickAdd } from './QuickAdd';

// CA-121 (T-081, nivel de componente): miniaturas de color, tallas cuadradas, imagen por color y botón «Elige talla». El
// carrito real, el umbral por ancho y el aspecto los comprueba el e2e `catalog-quick-add`.

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

const colors: QuickAddColor[] = [
  {
    color: 'azul',
    sizes: [
      { variantId: 'a1', size: 'S', stock: 0 },
      { variantId: 'a2', size: 'M', stock: 3 },
      { variantId: 'a3', size: 'L', stock: 5 },
      { variantId: 'a4', size: 'XL', stock: 0 },
    ],
  },
  { color: 'negro', sizes: [{ variantId: 'n1', size: '40', stock: 2 }] },
];

const images = [
  { path: '/products/azul.svg', alt: 'Polo demo, color azul' },
  { path: '/products/negro.svg', alt: 'Polo demo, color negro' },
];

function card(list: readonly QuickAddColor[] = colors, defaultColor = 'azul') {
  return render(
    <CardColorProvider defaultColor={defaultColor}>
      <CardImage images={images} priority={false} />
      <QuickAdd productName="Polo demo" colors={list} signedIn={false} />
    </CardColorProvider>,
  );
}

describe('QuickAdd', () => {
  it('va debajo de la foto, no encima: sin posición absoluta, oculto por debajo de md y al fondo de la tarjeta', () => {
    card();
    const root = screen.getByTestId('quick-add');
    // `relative z-10`: por encima del enlace extendido de la tarjeta, para que los controles reciban las pulsaciones.
    for (const cls of ['hidden', 'md:block', 'mt-auto', 'relative', 'z-10']) expect(root.className, cls).toContain(cls);
    for (const cls of ['absolute', 'inset-x-0', 'bottom-0', 'opacity-0', 'group-hover:opacity-100', 'backdrop-blur']) {
      expect(root.className, cls).not.toContain(cls);
    }
  });

  it('muestra una miniatura por color, con la del color inicial marcada con el borde de acento', () => {
    card();
    const thumbs = screen.getAllByTestId('quick-add-color');
    expect(thumbs.map((t) => t.getAttribute('aria-label'))).toEqual(['Color Azul', 'Color Negro']);
    expect(thumbs[0]).toHaveAttribute('aria-pressed', 'true');
    expect(thumbs[1]).toHaveAttribute('aria-pressed', 'false');
    expect(thumbs[0]?.querySelector('span')?.className).toContain('ring-accent');
    expect(thumbs[1]?.querySelector('span')?.className).not.toContain('ring-accent');
    expect(thumbs[0]?.className).toContain('size-11');
  });

  it('con un solo color no hay miniaturas', () => {
    card([colors[0] as QuickAddColor]);
    expect(screen.queryAllByTestId('quick-add-color')).toHaveLength(0);
  });

  it('las tallas son botones cuadrados; las agotadas, desactivadas, tachadas y con opacidad reducida', () => {
    card();
    const buttons = screen.getAllByTestId('quick-add-size');
    expect(buttons.map((b) => b.textContent)).toEqual(['S', 'M', 'L', 'XL']);
    for (const b of buttons) {
      expect(b.className).toContain('size-11');
      expect(b.className).toContain('rounded-control');
    }
    for (const index of [0, 3]) {
      const sold = buttons[index];
      expect(sold).toBeDisabled();
      expect(sold?.className).toContain('disabled:line-through');
      expect(sold?.className).toContain('disabled:opacity-40');
      expect(sold?.getAttribute('aria-label')).toBe(`Talla ${index === 0 ? 'S' : 'XL'}, agotada`);
    }
    expect(buttons[1]).toBeEnabled();
  });

  it('elegir una talla la marca con bg-accent y text-accent-fg; las agotadas no se eligen', () => {
    card();
    const [, m, l, xl] = screen.getAllByTestId('quick-add-size');
    fireEvent.click(m as HTMLElement);
    expect(m).toHaveAttribute('aria-pressed', 'true');
    expect(m?.className).toContain('bg-accent');
    expect(m?.className).toContain('text-accent-fg');
    fireEvent.click(l as HTMLElement);
    expect(m).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(xl as HTMLElement);
    expect(xl).toHaveAttribute('aria-pressed', 'false');
  });

  it('el botón ocupa todo el ancho, dice «Elige talla» y está desactivado hasta elegir; luego «Añadir a la cesta»', () => {
    card();
    const button = screen.getByTestId('quick-add-button');
    expect(button.textContent).toBe('Elige talla');
    expect(button).toBeDisabled();
    expect(button.getAttribute('data-full')).toBe('true');
    fireEvent.click(screen.getAllByTestId('quick-add-size')[1] as HTMLElement);
    expect(screen.getByTestId('quick-add-button').textContent).toBe('Añadir a la cesta');
    expect(screen.getByTestId('quick-add-button')).toBeEnabled();
  });

  it('elegir otro color cambia las tallas, marca la miniatura, borra la talla elegida y cambia la imagen principal', () => {
    card();
    expect(screen.getByTestId('card-image')).toHaveAttribute('src', expect.stringContaining('azul.svg'));
    fireEvent.click(screen.getAllByTestId('quick-add-size')[1] as HTMLElement);
    fireEvent.click(screen.getAllByTestId('quick-add-color')[1] as HTMLElement);
    expect(screen.getAllByTestId('quick-add-color')[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('quick-add-color')[0]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId('quick-add-size').map((b) => b.textContent)).toEqual(['40']);
    expect(screen.getByTestId('quick-add-button').textContent).toBe('Elige talla');
    expect(screen.getByTestId('card-image')).toHaveAttribute('src', expect.stringContaining('negro.svg'));
    expect(screen.getByTestId('card-image')).toHaveAttribute('alt', 'Polo demo, color negro');
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

describe('ProductCard y los controles de compra (CA-121)', () => {
  it('sin la propiedad quickAdd (portada, búsqueda) no hay controles ni miniaturas', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} />);
    expect(screen.queryByTestId('quick-add')).toBeNull();
    expect(screen.queryByTestId('card-image')).toBeNull();
  });

  it('con quickAdd y stock lleva los controles debajo del precio, no dentro de la imagen', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} quickAdd={{ signedIn: false }} />);
    const controls = screen.getByTestId('quick-add');
    const media = screen.getByTestId('card-image').parentElement as HTMLElement;
    expect(media.contains(controls)).toBe(false);
    expect(screen.getByTestId('card-price').compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('una prenda de un solo color no lleva miniaturas y una agotada no lleva controles', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.queryAllByTestId('quick-add-color')).toHaveLength(0);
    cleanup();
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 0 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.queryByTestId('quick-add')).toBeNull();
  });
});
