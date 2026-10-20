import { expect, test, type Page } from '@playwright/test';

// CA-80 (T-045): los 21 productos nuevos del catálogo de ejemplo aparecen en el catálogo de su género con su
// categoría, su precio, su color y su foto, y se pueden filtrar por categoría. Dependen de
// `supabase/seed/catalog-new-products.sql` aplicado en Supabase.

type Gender = 'hombre' | 'mujer';

interface NewProduct {
  readonly slug: string;
  readonly name: string;
  readonly gender: Gender;
  readonly category: string;
  readonly price: string;
  readonly color: string;
  readonly file: string;
}

const NEW_PRODUCTS: readonly NewProduct[] = [
  { slug: 'sudadera-oversize-negra', name: 'Sudadera oversize negra', gender: 'hombre', category: 'sudaderas', price: '49,90', color: 'negro', file: 'sudadera-oversize-negra' },
  { slug: 'hoodie-gris', name: 'Hoodie gris', gender: 'hombre', category: 'sudaderas', price: '49,90', color: 'gris', file: 'hoodie-gris' },
  { slug: 'camiseta-grafica-blanca', name: 'Camiseta gráfica blanca', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'blanco', file: 'camiseta-grafica-blanca' },
  { slug: 'camiseta-negra-hombre', name: 'Camiseta negra', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'negro', file: 'camiseta-negra-hombre' },
  { slug: 'polera-comic-art', name: 'Polera cómic art', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'blanco', file: 'polera-comic-hero' },
  { slug: 'polera-dark-art', name: 'Polera dark art', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'negro', file: 'polera-dark-hero' },
  { slug: 'polera-aranaz', name: 'Polera Arañaz', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'rojo', file: 'polera-spider-verse' },
  { slug: 'polera-verde-grafico', name: 'Polera verde gráfico', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'verde', file: 'polera-hulk-smash' },
  { slug: 'polera-pop-collage', name: 'Polera pop collage', gender: 'hombre', category: 'camisetas', price: '29,90', color: 'negro', file: 'polera-team-heroes' },
  { slug: 'pantalon-cargo-negro', name: 'Pantalón cargo negro', gender: 'hombre', category: 'pantalones', price: '59,90', color: 'negro', file: 'pantalon-cargo-negro' },
  { slug: 'chaqueta-cortavientos-gris', name: 'Chaqueta cortavientos gris', gender: 'hombre', category: 'chaquetas', price: '69,90', color: 'gris', file: 'chaqueta-cortavientos-gris' },
  { slug: 'bomber-negra', name: 'Bomber negra', gender: 'hombre', category: 'chaquetas', price: '69,90', color: 'negro', file: 'bomber-negra' },
  { slug: 'camisa-franela-oversize', name: 'Camisa de franela oversize', gender: 'hombre', category: 'camisas', price: '44,90', color: 'verde', file: 'camisa-franela-oversize' },
  { slug: 'top-crop-negro', name: 'Top crop negro', gender: 'mujer', category: 'tops', price: '19,90', color: 'negro', file: 'top-crop-negro' },
  { slug: 'falda-cargo-negra', name: 'Falda cargo negra', gender: 'mujer', category: 'faldas', price: '19,90', color: 'negro', file: 'falda-cargo-negra' },
  { slug: 'sudadera-cropped-rosa', name: 'Sudadera cropped rosa', gender: 'mujer', category: 'sudaderas', price: '49,90', color: 'rosa', file: 'sudadera-cropped-rosa' },
  { slug: 'polera-kawaii-blanca', name: 'Polera kawaii blanca', gender: 'mujer', category: 'camisetas', price: '29,90', color: 'blanco', file: 'polera-hello-kitty-blanca' },
  { slug: 'polera-kawaii-negra', name: 'Polera kawaii negra', gender: 'mujer', category: 'camisetas', price: '29,90', color: 'negro', file: 'polera-hello-kitty-negra' },
  { slug: 'polera-comic-pop-mujer', name: 'Polera pop cómic', gender: 'mujer', category: 'camisetas', price: '29,90', color: 'blanco', file: 'polera-comic-pop-mujer' },
  { slug: 'pantalon-cargo-mujer-beige', name: 'Pantalón cargo beige', gender: 'mujer', category: 'pantalones', price: '59,90', color: 'beige', file: 'pantalon-cargo-mujer-beige' },
  { slug: 'chaqueta-vaquera-oversize', name: 'Chaqueta vaquera oversize', gender: 'mujer', category: 'chaquetas', price: '69,90', color: 'azul', file: 'chaqueta-vaquera-oversize' },
];

// Productos de cada categoría (los del seed anterior y los nuevos), en el catálogo de cada género.
const CATEGORY_NAMES: Readonly<Record<Gender, Readonly<Record<string, readonly string[]>>>> = {
  hombre: {
    camisas: ['Camisa oxford de algodón', 'Camisa de popelín', 'Camisa de franela oversize'],
    pantalones: ['Pantalón chino slim', 'Pantalón de traje', 'Pantalón cargo negro'],
    camisetas: ['Camiseta gráfica blanca', 'Camiseta negra', 'Polera cómic art', 'Polera dark art', 'Polera Arañaz', 'Polera verde gráfico', 'Polera pop collage'],
    sudaderas: ['Sudadera oversize negra', 'Hoodie gris'],
    chaquetas: ['Chaqueta cortavientos gris', 'Bomber negra'],
  },
  mujer: {
    pantalones: ['Pantalón fluido', 'Pantalón cargo beige'],
    camisetas: ['Polera kawaii blanca', 'Polera kawaii negra', 'Polera pop cómic'],
    sudaderas: ['Sudadera cropped rosa'],
    chaquetas: ['Chaqueta vaquera oversize'],
    faldas: ['Falda cargo negra'],
    tops: ['Top crop negro'],
  },
};

const CATEGORY_CHIPS: Readonly<Record<Gender, readonly string[]>> = {
  hombre: ['polos', 'camisas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas'],
  mujer: ['polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'faldas', 'tops'],
};

const sorted = (values: readonly string[]) => [...values].sort();
const names = (page: Page) => page.locator('article h2').allInnerTexts();

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

test.describe('los 21 productos nuevos en el catálogo (CA-80)', () => {
  test('son 21 y cada género tiene los suyos', () => {
    expect(NEW_PRODUCTS).toHaveLength(21);
    expect(NEW_PRODUCTS.filter((p) => p.gender === 'hombre')).toHaveLength(13);
    expect(NEW_PRODUCTS.filter((p) => p.gender === 'mujer')).toHaveLength(8);
  });

  for (const gender of ['hombre', 'mujer'] as const) {
    for (const [category, expected] of Object.entries(CATEGORY_NAMES[gender])) {
      test(`${gender}: el filtro «${category}» lista sus productos`, async ({ page }) => {
        await open(page, `/${gender}?categoria=${category}`);
        expect(sorted(await names(page))).toEqual(sorted(expected));
      });
    }

    test(`${gender}: los chips de categoría ofrecen solo las presentes, en el orden canónico`, async ({ page }) => {
      await open(page, `/${gender}`);
      const values = await page
        .locator('[data-testid="filters-sidebar"] input[name="categoria"]')
        .evaluateAll((inputs) => inputs.map((input) => (input instanceof HTMLInputElement ? input.value : '')));
      expect(values.filter((value) => value !== '')).toEqual(CATEGORY_CHIPS[gender]);
    });
  }

  for (const product of NEW_PRODUCTS) {
    test(`«${product.name}»: tarjeta con precio y foto, y ficha con su color`, async ({ page }) => {
      await open(page, `/${product.gender}?categoria=${product.category}`);
      const card = page.locator('article', { has: page.getByRole('heading', { name: product.name, exact: true }) });
      await expect(card).toContainText(product.price);
      const img = card.locator('img').first();
      await expect(img).toHaveAttribute('src', new RegExp(`/images/products/${product.file}.webp`));
      expect(((await img.getAttribute('alt')) ?? '').trim().length).toBeGreaterThan(0);
      await img.scrollIntoViewIfNeeded();
      expect(await imageLoaded(img)).toBe(true);

      await page.goto(`/producto/${product.slug}`);
      await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
      await expect(page.getByText(product.price).first()).toBeVisible();
      await expect(page.getByRole('group', { name: /Color/ })).toContainText(new RegExp(product.color, 'i'));
      const hero = page.locator('main img').first();
      await expect(hero).toHaveAttribute('src', new RegExp(`/images/products/${product.file}.webp`));
      expect(await imageLoaded(hero)).toBe(true);
    });
  }

  test('las categorías nuevas no tienen guía de tallas: la ficha no muestra el enlace', async ({ page }) => {
    await page.goto('/producto/camiseta-negra-hombre');
    await expect(page.getByRole('heading', { level: 1, name: 'Camiseta negra' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Guía de tallas/ })).toHaveCount(0);
  });
});
