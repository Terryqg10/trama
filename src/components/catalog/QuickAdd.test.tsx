import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogRowSchema, toCatalogProduct } from '@/lib/catalog/product';
import type { QuickAddColor } from '@/lib/catalog/quick-add';
import { ProductCard } from './ProductCard';
import { CardColorProvider, CardImage, ColorDots, QuickAdd } from './QuickAdd';

// CA-122 (T-082, nivel de componente): círculos de color, panel de tallas sobre la parte baja de la foto, imagen por color y Esc. El hover
// real, el carrito y el umbral por ancho los comprueba el e2e `catalog-quick-add`.

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

function card(list: readonly QuickAddColor[] = colors) {
  return render(
    <article className="group">
      <CardColorProvider defaultColor="azul">
        <CardImage images={images} priority={false} />
        <ColorDots productName="Polo demo" colors={list} />
        <QuickAdd productName="Polo demo" colors={list} signedIn={false} />
      </CardColorProvider>
    </article>,
  );
}

describe('ColorDots', () => {
  it('un botón por color, solo desde md, alineado a la izquierda, con el elegido con anillo (ring-2 ring-offset-2) y zona de 44 px', () => {
    card();
    expect(screen.getByTestId('color-dots').className).toContain('hidden');
    expect(screen.getByTestId('color-dots').className).toContain('md:flex');
    const dots = screen.getAllByTestId('quick-add-color');
    expect(dots.map((d) => d.getAttribute('aria-label'))).toEqual(['Color Azul', 'Color Negro']);
    expect(dots[0]).toHaveAttribute('aria-pressed', 'true');
    expect(dots[1]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('color-dots').className).toContain('-ml-3');
    expect(dots[0]?.querySelector('span')?.className).toContain('ring-2');
    expect(dots[0]?.querySelector('span')?.className).toContain('ring-offset-2');
    expect(dots[0]?.querySelector('span')?.className).toContain('ring-accent');
    expect(dots[1]?.querySelector('span')?.className).not.toContain('ring-2');
    expect(dots[0]?.className).toContain('size-11');
    expect(dots[0]?.querySelector('span')?.className).toContain('size-5');
  });

  it('elegir otro color cambia las tallas, borra la talla elegida y cambia la imagen principal', () => {
    card();
    expect(screen.getByTestId('card-image')).toHaveAttribute('src', expect.stringContaining('azul.svg'));
    fireEvent.click(screen.getAllByTestId('quick-add-size')[1] as HTMLElement);
    expect(screen.getByTestId('quick-add-button')).toBeEnabled();
    fireEvent.click(screen.getAllByTestId('quick-add-color')[1] as HTMLElement);
    expect(screen.getAllByTestId('quick-add-color')[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('quick-add-size').map((b) => b.textContent)).toEqual(['40']);
    expect(screen.getByTestId('quick-add-button')).toBeDisabled();
    expect(screen.getByTestId('card-image')).toHaveAttribute('src', expect.stringContaining('negro.svg'));
    expect(screen.getByTestId('card-image')).toHaveAttribute('alt', 'Polo demo, color negro');
  });
});

describe('QuickAdd (panel sobre la parte baja de la foto)', () => {
  it('va pegado al borde inferior de la foto: absoluto, inset-x-0 y bottom-0, con fondo translúcido y desenfoque', () => {
    card();
    const root = screen.getByTestId('quick-add');
    for (const cls of ['absolute', 'inset-x-0', 'bottom-0', 'z-10', 'hidden', 'md:block', 'bg-surface/95', 'backdrop-blur-sm', 'p-4']) {
      expect(root.className, cls).toContain(cls);
    }
    for (const cls of ['top-full', 'rounded-b-card', 'inset-0', 'inset-y-0']) expect(root.className, cls).not.toContain(cls);
  });

  it('sube desde el borde inferior con opacity y translate (hover o foco), no recibe pulsaciones mientras no se ve y no se mueve con reduced-motion', () => {
    card();
    const cls = screen.getByTestId('quick-add').className;
    for (const expected of [
      'opacity-0',
      'translate-y-full',
      'pointer-events-none',
      'group-hover:opacity-100',
      'group-hover:translate-y-0',
      'group-hover:pointer-events-auto',
      'group-focus-within:opacity-100',
      'group-focus-within:translate-y-0',
      'group-focus-within:pointer-events-auto',
      'transition',
      'duration-300',
      'motion-reduce:transition-none',
      'motion-reduce:translate-y-0',
    ]) {
      expect(cls, expected).toContain(expected);
    }
  });

  it('muestra todas las tallas como botones cuadrados; las agotadas, desactivadas, tachadas y con opacidad', () => {
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

  it('el botón «Añadir a la cesta» ocupa todo el ancho y está desactivado hasta elegir talla', () => {
    card();
    const button = screen.getByTestId('quick-add-button');
    expect(button.textContent).toBe('Añadir a la cesta');
    expect(button).toBeDisabled();
    expect(button.getAttribute('data-full')).toBe('true');
    fireEvent.click(screen.getAllByTestId('quick-add-size')[1] as HTMLElement);
    expect(screen.getByTestId('quick-add-button')).toBeEnabled();
  });

  it('Esc lo oculta (data-dismissed)', () => {
    card();
    const root = screen.getByTestId('quick-add');
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

const two = [
  { id: 'v1', size: 'M', color: 'azul', stock: 5 },
  { id: 'v2', size: 'M', color: 'negro', stock: 5 },
];

describe('ProductCard: estado normal limpio (CA-122)', () => {
  it('un círculo de 20 px por color en lugar del texto «N colores», que queda solo para lectores de pantalla', () => {
    render(<ProductCard product={product(two)} />);
    const dots = screen.getByTestId('card-colors');
    expect(dots.getAttribute('aria-hidden')).toBe('true');
    expect(dots.querySelectorAll('span')).toHaveLength(2);
    for (const dot of dots.querySelectorAll('span')) {
      expect(dot.className).toContain('size-5');
      expect(dot.className).toContain('rounded-full');
    }
    const text = screen.getByText('2 colores');
    expect(text.className).toContain('sr-only');
  });

  it('una prenda de un solo color lleva un círculo', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} />);
    expect(screen.getByTestId('card-colors').querySelectorAll('span')).toHaveLength(1);
    expect(screen.getByText('1 color').className).toContain('sr-only');
  });

  it('un color sin muestra definida usa un círculo neutro', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'turquesa', stock: 5 }])} />);
    expect(screen.getByTestId('card-colors').querySelector('span')?.className).toContain('bg-surface-muted');
  });

  it('en la portada y la búsqueda (sin quickAdd) los círculos se ven en todos los anchos y no hay panel', () => {
    render(<ProductCard product={product(two)} />);
    expect(screen.getByTestId('card-colors').className).not.toContain('md:hidden');
    expect(screen.queryByTestId('quick-add')).toBeNull();
    expect(screen.queryByTestId('color-dots')).toBeNull();
  });

  it('en el catálogo con varios colores los círculos estáticos solo se ven en móvil y desde md son botones', () => {
    render(<ProductCard product={product(two)} quickAdd={{ signedIn: false }} />);
    expect(screen.getByTestId('card-colors').className).toContain('md:hidden');
    expect(screen.getAllByTestId('quick-add-color')).toHaveLength(2);
  });

  it('en el catálogo con un solo color el círculo se ve siempre y no hay botones de color', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 5 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.getByTestId('card-colors').className).not.toContain('md:hidden');
    expect(screen.queryAllByTestId('quick-add-color')).toHaveLength(0);
    expect(screen.getByTestId('quick-add')).toBeInTheDocument();
  });

  it('el panel está dentro del contenedor de la foto (que recorta sin permitir scroll) y la tarjeta recorta como siempre', () => {
    const { container } = render(<ProductCard product={product(two)} quickAdd={{ signedIn: false }} />);
    const media = screen.getByTestId('card-image').parentElement as HTMLElement;
    expect(media.contains(screen.getByTestId('quick-add'))).toBe(true);
    expect(media.className).toContain('overflow-clip');
    expect(media.className).toContain('relative');
    const article = container.querySelector('article') as HTMLElement;
    expect(article.className).toContain('overflow-hidden');
    expect(article.className).not.toContain('hover:z-20');
  });

  it('el texto (nombre, círculos y precio) no está dentro del panel ni se mueve con él: va en un bloque aparte', () => {
    render(<ProductCard product={product(two)} quickAdd={{ signedIn: false }} />);
    const panel = screen.getByTestId('quick-add');
    for (const node of [screen.getByRole('heading', { name: 'Polo demo' }), screen.getByTestId('card-price'), screen.getByTestId('card-colors')]) {
      expect(panel.contains(node)).toBe(false);
    }
  });

  it('una prenda agotada no lleva panel', () => {
    render(<ProductCard product={product([{ id: 'v1', size: 'M', color: 'azul', stock: 0 }])} quickAdd={{ signedIn: false }} />);
    expect(screen.queryByTestId('quick-add')).toBeNull();
  });
});
