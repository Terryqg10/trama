import { expect, test, type Page } from '@playwright/test';

// CA-97 (T-056) y CA-96 (T-055, en el catálogo): los seis productos de otoño del seed `catalog-autumn.sql` salen en el
// catálogo de su género con su categoría, precio, color y foto, y se filtran por sus categorías nuevas.
// Requiere la migración de las once categorías y el seed aplicados en Supabase.

type Gender = 'hombre' | 'mujer';
interface Autumn {
  readonly slug: string;
  readonly name: string;
  readonly gender: Gender;
  readonly category: string;
  readonly price: string;
  readonly color: string;
}

const AUTUMN: readonly Autumn[] = [
  { slug: 'abrigo-pano-gris', name: 'Abrigo de paño gris', gender: 'hombre', category: 'abrigos', price: '89,90', color: 'gris' },
  { slug: 'jersey-cuello-alto-negro', name: 'Jersey de cuello alto negro', gender: 'hombre', category: 'jerseis', price: '39,90', color: 'negro' },
  { slug: 'chaqueta-acolchada-negra', name: 'Chaqueta acolchada negra', gender: 'hombre', category: 'chaquetas', price: '79,90', color: 'negro' },
  { slug: 'abrigo-largo-camel', name: 'Abrigo largo camel', gender: 'mujer', category: 'abrigos', price: '99,90', color: 'camel' },
  { slug: 'jersey-punto-crema', name: 'Jersey de punto crema', gender: 'mujer', category: 'jerseis', price: '44,90', color: 'crema' },
  { slug: 'jersey-punto-marron', name: 'Jersey de punto marrón', gender: 'mujer', category: 'jerseis', price: '44,90', color: 'marron' },
];

async function open(page: Page, url: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url);
  await expect(page.getByRole('status')).toHaveCount(0);
}

async function imageLoaded(img: ReturnType<Page['locator']>): Promise<boolean> {
  return img.evaluate(async (el) => {
    if (!(el instanceof HTMLImageElement)) return false;
    await el.decode().catch(() => undefined);
    return el.naturalWidth > 0;
  });
}

test.describe('productos de otoño en el catálogo (CA-96, CA-97)', () => {
  test('son seis y cada género tiene los suyos', () => {
    expect(AUTUMN).toHaveLength(6);
    expect(AUTUMN.filter((p) => p.gender === 'hombre')).toHaveLength(3);
    expect(AUTUMN.filter((p) => p.gender === 'mujer')).toHaveLength(3);
  });

  for (const product of AUTUMN) {
    test(`«${product.name}»: tarjeta con precio y foto, ficha con su color y filtro por «${product.category}»`, async ({ page }) => {
      await open(page, `/${product.gender}?categoria=${product.category}`);
      const card = page.locator('article', { has: page.getByRole('heading', { name: product.name, exact: true }) });
      await expect(card).toContainText(product.price);
      const img = card.locator('img').first();
      await expect(img).toHaveAttribute('src', new RegExp(`/images/products/${product.slug}.webp`));
      expect(((await img.getAttribute('alt')) ?? '').trim().length).toBeGreaterThan(0);
      await img.scrollIntoViewIfNeeded();
      expect(await imageLoaded(img)).toBe(true);

      await page.goto(`/producto/${product.slug}`);
      await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
      await expect(page.getByText(product.price).first()).toBeVisible();
      await expect(page.getByRole('group', { name: /Color/ })).toContainText(new RegExp(product.color, 'i'));
      const hero = page.locator('main img').first();
      await expect(hero).toHaveAttribute('src', new RegExp(`/images/products/${product.slug}.webp`));
      expect(await imageLoaded(hero)).toBe(true);
    });
  }

  test('los colores nuevos tienen muestra (círculo) en la ficha', async ({ page }) => {
    for (const slug of ['abrigo-largo-camel', 'jersey-punto-crema', 'jersey-punto-marron']) {
      await page.goto(`/producto/${slug}`);
      await expect(page.getByRole('group', { name: /Color/ }).locator('[class*="bg-swatch-"]').first()).toBeVisible();
    }
  });

  test('las búsquedas «abrigo» y «jersey» encuentran los productos de otoño', async ({ page }) => {
    await open(page, '/buscar?q=abrigo');
    expect((await page.locator('article h2').allInnerTexts()).sort()).toEqual(['Abrigo de paño gris', 'Abrigo largo camel']);
    await open(page, '/buscar?q=jersey');
    expect((await page.locator('article h2').allInnerTexts()).sort()).toEqual([
      'Jersey de cuello alto negro',
      'Jersey de punto crema',
      'Jersey de punto marrón',
    ]);
  });
});
