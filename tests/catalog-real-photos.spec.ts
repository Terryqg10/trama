import { test, expect, type Locator } from '@playwright/test';

// CA-68 (T-036, hombre) y CA-71 (T-038, mujer): los productos del seed muestran su foto real (WebP) en el
// catálogo y en su ficha. Dependen de `supabase/seed/catalog-demo.sql`, `catalog-photos.sql` y
// `catalog-photos-mujer.sql` aplicados en Supabase.

const PHOTOS = [
  { slug: 'polo-pique-basico', name: 'Polo piqué básico', file: 'polo-pique-azul-marino', gender: 'hombre' },
  { slug: 'polo-punto-manga-larga', name: 'Polo de punto de manga larga', file: 'polo-punto-gris-manga-larga', gender: 'hombre' },
  { slug: 'camisa-oxford-algodon', name: 'Camisa oxford de algodón', file: 'camisa-oxford-blanca', gender: 'hombre' },
  { slug: 'camisa-popelin-vestir', name: 'Camisa de popelín', file: 'camisa-popelin-crema', gender: 'hombre' },
  { slug: 'pantalon-chino-slim', name: 'Pantalón chino slim', file: 'pantalon-chino-beige', gender: 'hombre' },
  { slug: 'pantalon-traje-lana', name: 'Pantalón de traje', file: 'pantalon-vestir-gris-marengo', gender: 'hombre' },
] as const;

const PHOTOS_MUJER = [
  { slug: 'blusa-lino-casual', name: 'Blusa de lino', file: 'blusa-lino-crema', gender: 'mujer' },
  { slug: 'blusa-satinada-vestir', name: 'Blusa satinada', file: 'blusa-satinada-burdeos', gender: 'mujer' },
  { slug: 'blusa-popelin-lazada', name: 'Blusa de popelín con lazada', file: 'blusa-popelin-lazada', gender: 'mujer' },
  { slug: 'polo-punto-mujer', name: 'Polo de punto', file: 'polo-punto-verde', gender: 'mujer' },
  { slug: 'camisa-oversize-mujer', name: 'Camisa oversize', file: 'camisa-oversize-azul', gender: 'mujer' },
  { slug: 'pantalon-fluido-vestir', name: 'Pantalón fluido', file: 'pantalon-fluido-negro', gender: 'mujer' },
] as const;

async function imageLoaded(img: Locator): Promise<boolean> {
  return img.evaluate(async (el) => {
    if (!(el instanceof HTMLImageElement)) return false;
    await el.decode().catch(() => undefined);
    return el.naturalWidth > 0;
  });
}

test.describe('catálogo con fotos reales (CA-68, CA-71)', () => {
  for (const [gender, photos] of [
    ['hombre', PHOTOS],
    ['mujer', PHOTOS_MUJER],
  ] as const) {
  test(`el listado de ${gender} muestra la foto de cada producto, con texto alternativo y cargada`, async ({ page }) => {
    await page.goto(`/${gender}`);
    await expect(page.getByRole('status')).toHaveCount(0);
    for (const photo of photos) {
      const card = page.locator('article', { has: page.getByRole('heading', { name: photo.name, exact: true }) });
      const img = card.locator('img').first();
      await expect(img, photo.name).toHaveAttribute('src', new RegExp(`/images/products/${photo.file}\.webp`));
      const alt = await img.getAttribute('alt');
      expect((alt ?? '').trim().length, `alt de ${photo.name}`).toBeGreaterThan(0);
      await img.scrollIntoViewIfNeeded();
      expect(await imageLoaded(img), `${photo.name} carga`).toBe(true);
    }
  });

  }

  for (const photo of [...PHOTOS, ...PHOTOS_MUJER]) {
    test(`la ficha de ${photo.slug} muestra su foto`, async ({ page }) => {
      await page.goto(`/producto/${photo.slug}`);
      const img = page.locator('main img').first();
      await expect(img).toHaveAttribute('src', new RegExp(`/images/products/${photo.file}\.webp`));
      expect(((await img.getAttribute('alt')) ?? '').trim().length).toBeGreaterThan(0);
      expect(await imageLoaded(img)).toBe(true);
    });
  }

  test('al elegir otro color, la ficha muestra el SVG heredado de ese color (las posiciones 1, 2… se conservan)', async ({ page }) => {
    await page.goto('/producto/camisa-oxford-algodon?color=azul');
    const img = page.locator('main img').first();
    await expect(img).toHaveAttribute('src', /^\/products\/camisas-azul\.svg$/);
    await expect(img).toHaveAttribute('alt', /color azul$/);
  });
});
