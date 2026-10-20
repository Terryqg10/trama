import { expect, test, type Page } from '@playwright/test';

// CA-111 (T-067): sección de confianza «Compra con tranquilidad» de la portada (sustituye al bloque «Envío y
// devolución» y a las propuestas de valor del newsletter). La ficha y el carrito conservan el bloque compacto.

const section = (page: Page) => page.getByTestId('trust-section');

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(section(page)).toBeAttached();
  await section(page).scrollIntoViewIfNeeded();
}

test.describe('sección de confianza (CA-111)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('tiene título y cuatro tarjetas con icono, título y texto', async ({ page }) => {
    await open(page);
    await expect(section(page).getByRole('heading', { level: 2, name: 'Compra con tranquilidad' })).toBeVisible();
    const pillars = page.getByTestId('trust-pillar');
    await expect(pillars).toHaveCount(4);
    const titles = ['Envío en 24-48 h', '30 días para devolver', 'Pago 100 % seguro', 'Sigue tu pedido'];
    for (const [i, title] of titles.entries()) {
      const pillar = pillars.nth(i);
      await expect(pillar.getByRole('heading', { level: 3, name: title })).toBeVisible();
      await expect(pillar.locator('svg').first()).toBeVisible();
      expect(((await pillar.locator('p').first().innerText()) ?? '').trim().length).toBeGreaterThan(10);
    }
  });

  test('los importes y plazos salen de la tienda: 4,95 €, 50,00 € y 30 días', async ({ page }) => {
    await open(page);
    const text = await section(page).innerText();
    expect(text).toContain('4,95');
    expect(text).toContain('50,00');
    expect(text).toContain('30 días');
    expect(text).not.toContain('49,99');
    expect(text).not.toContain('*');
  });

  test('lleva la nota de condiciones de ejemplo y el enlace a las condiciones', async ({ page }) => {
    await open(page);
    await expect(section(page)).toContainText('Condiciones de ejemplo');
    await section(page).getByRole('link', { name: 'Ver condiciones' }).click();
    await expect(page).toHaveURL(/\/condiciones$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('«Ir a mis pedidos» lleva a la cuenta (sin sesión, al acceso)', async ({ page }) => {
    await open(page);
    await section(page).getByRole('link', { name: 'Ir a mis pedidos' }).click();
    await expect(page).toHaveURL(/\/(cuenta\/pedidos|acceso)/);
  });

  test('está entre las novedades y el newsletter, y no repite las propuestas de valor ni el banner', async ({ page }) => {
    await open(page);
    const newArrivals = await page.getByTestId('new-arrivals').boundingBox();
    const trust = await section(page).boundingBox();
    const news = await page.getByTestId('newsletter').boundingBox();
    expect((newArrivals?.y ?? 0) + (newArrivals?.height ?? 0)).toBeLessThanOrEqual((trust?.y ?? 0) + 1);
    expect((trust?.y ?? 0) + (trust?.height ?? 0)).toBeLessThanOrEqual((news?.y ?? 0) + 1);
    await expect(page.getByTestId('value-props')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Envío y devolución' })).toHaveCount(0);
  });

  for (const [width, columns] of [
    [1280, 4],
    [1024, 4],
    [768, 2],
    [640, 2],
    [375, 1],
    [320, 1],
  ] as const) {
    test(`a ${width} px hay ${columns} columna${columns > 1 ? 's' : ''} y no hay scroll horizontal`, async ({ page }) => {
      await open(page, width);
      const lefts = await page
        .getByTestId('trust-pillar')
        .evaluateAll((items) => [...new Set(items.map((item) => Math.round(item.getBoundingClientRect().left)))]);
      expect(lefts).toHaveLength(columns);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('los enlaces miden al menos 44 px de alto', async ({ page }) => {
    await open(page);
    for (const name of ['Ir a mis pedidos']) {
      expect((await section(page).getByRole('link', { name }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('la ficha y el carrito conservan el bloque compacto (RF-16)', () => {
  test('el carrito muestra «Envío y devolución»', async ({ page }) => {
    await page.goto('/carrito');
    await expect(page.getByRole('region', { name: 'Envío y devolución' })).toBeVisible();
  });
});
