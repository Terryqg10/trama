import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompleteLookResult } from '@/lib/cart/actions';
import type { CompleteLookItem } from '@/lib/cart/complete-look';
import { CompleteLook } from './CompleteLook';

// CA-153 (T-121, nivel de componente): tarjetas, «+» con tallas, añadido directo con una sola talla y ocultar sin sugerencias.

const load = vi.fn<(slugs: string[]) => Promise<CompleteLookResult>>();
vi.mock('@/lib/cart/actions', () => ({ getCompleteLookAction: (slugs: string[]) => load(slugs) }));

function item(slug: string, sizes: { size: string; stock: number }[]): CompleteLookItem {
  return {
    id: `id-${slug}`,
    slug,
    name: `Polo ${slug}`,
    fromPriceCents: 2990,
    image: { path: `/products/${slug}.webp`, alt: `Polo ${slug}, color negro` },
    color: 'negro',
    sizes: sizes.map((entry) => ({ variantId: `v-${slug}-${entry.size}`, ...entry })),
  };
}

const ITEMS = [
  item('a', [
    { size: 'S', stock: 0 },
    { size: 'M', stock: 3 },
    { size: 'L', stock: 2 },
  ]),
  item('b', [
    { size: 'S', stock: 0 },
    { size: 'M', stock: 4 },
  ]),
];

async function mount(cartSlugs: string[], onAdd = vi.fn()) {
  render(<CompleteLook cartSlugs={cartSlugs} onAdd={onAdd} onNavigate={vi.fn()} />);
  await act(async () => {});
  return onAdd;
}

beforeEach(() => load.mockReset());
afterEach(cleanup);

describe('CompleteLook (CA-153)', () => {
  it('pide los básicos excluyendo los slugs del carrito y muestra foto, nombre, precio y «+»', async () => {
    load.mockResolvedValue({ status: 'ok', items: ITEMS });
    await mount(['x', 'y']);
    expect(load).toHaveBeenCalledWith(['x', 'y']);
    expect(screen.getByRole('heading', { name: 'Completa tu look' })).toBeTruthy();
    const cards = screen.getAllByTestId('complete-look-item');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent).toContain('Polo a');
    expect(cards[0]?.textContent).toContain('29,90');
    expect(screen.getAllByTestId('complete-look-plus')).toHaveLength(2);
  });

  it('«+» despliega las tallas (la agotada, desactivada) y al elegir una la añade', async () => {
    load.mockResolvedValue({ status: 'ok', items: ITEMS });
    const onAdd = await mount([]);
    fireEvent.click(screen.getAllByTestId('complete-look-plus')[0] as HTMLElement);
    const sizes = screen.getAllByTestId('complete-look-size');
    expect(sizes.map((button) => (button as HTMLButtonElement).disabled)).toEqual([true, false, false]);
    fireEvent.click(sizes[2] as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith('v-a-L', 2, 'Polo a');
    expect(screen.queryByTestId('complete-look-sizes')).toBeNull();
  });

  it('con una sola talla con stock, «+» la añade directamente', async () => {
    load.mockResolvedValue({ status: 'ok', items: ITEMS });
    const onAdd = await mount([]);
    fireEvent.click(screen.getAllByTestId('complete-look-plus')[1] as HTMLElement);
    expect(onAdd).toHaveBeenCalledWith('v-b-M', 4, 'Polo b');
    expect(screen.queryByTestId('complete-look-sizes')).toBeNull();
  });

  it('sin sugerencias o si la consulta falla, no muestra nada; y no enseña lo que ya está en el carrito', async () => {
    load.mockResolvedValue({ status: 'error' });
    await mount([]);
    expect(screen.queryByTestId('complete-look')).toBeNull();
    cleanup();
    load.mockResolvedValue({ status: 'ok', items: ITEMS });
    await mount(['a', 'b']);
    expect(screen.queryByTestId('complete-look')).toBeNull();
  });
});
