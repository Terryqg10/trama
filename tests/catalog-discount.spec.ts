import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-119 (T-076): insignia «-N%» y precio anterior tachado en la tarjeta. Depende del seed `catalog-discounts.sql`
// (T-075): cinco prendas de ejemplo con precio anterior.

const DISCOUNTED = [
  { gender: 'hombre', name: 'Abrigo de paño gris', now: '89,90', before: '119,90', percent: 25 },
  { gender: 'hombre', name: 'Chaqueta acolchada negra', now: '79,90', before: '99,90', percent: 20 },
  { gender: 'mujer', name: 'Abrigo largo camel', now: '99,90', before: '129,90', percent: 23 },
  { gender: 'mujer', name: 'Jersey de punto crema', now: '44,90', before: '59,90', percent: 25 },
] as const;

async function open(page: Page, path: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator('article').first()).toBeVisible();
}

const card = (page: Page, name: string): Locator =>
  page.locator('article', { has: page.getByRole('heading', { name, exact: true }) });

const normalize = (value: string): string => value.replace(/\s/g, ' ');

/** Contraste WCAG entre dos colores `rgb(...)` calculados. */
function contrast(a: string, b: string): number {
  const channels = (color: string) => (/(\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).map(Number);
  const luminance = (rgb: number[]) => {
    const [r = 0, g = 0, bl = 0] = rgb.map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const la = luminance(channels(a));
  const lb = luminance(channels(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test.describe('tarjetas con rebaja (CA-119)', () => {
  for (const item of DISCOUNTED) {
    test(`${item.name}: insignia «-${item.percent}%», precio actual en negrita y anterior tachado`, async ({ page }) => {
      await open(page, `/${item.gender}`);
      const target = card(page, item.name);
      await expect(target.getByTestId('discount-badge')).toContainText(`-${item.percent}%`);
      const now = target.getByTestId('card-price').locator('span.font-bold');
      expect(normalize(await now.innerText())).toContain(item.now);
      expect(await now.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700');
      const before = target.getByTestId('card-price-before');
      expect(normalize(await before.innerText())).toBe(`${item.before} €`);
      expect(await before.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('line-through');
      // El precio anterior es más pequeño que el actual.
      const sizes = await Promise.all([now, before].map((el) => el.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))));
      expect(sizes[1]).toBeLessThan(sizes[0] ?? 0);
    });
  }

  test('el porcentaje de la insignia coincide con los dos precios mostrados', async ({ page }) => {
    await open(page, '/hombre');
    const discounted = page.locator('article:has([data-testid="discount-badge"])');
    const count = await discounted.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const article = discounted.nth(i);
      const badge = article.getByTestId('discount-badge');
      const parse = (text: string) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'));
      const now = parse(await article.getByTestId('card-price').locator('span.font-bold').innerText());
      const before = parse(await article.getByTestId('card-price-before').innerText());
      const shown = Number((await badge.innerText()).replace(/\D/g, ''));
      expect(shown).toBe(Math.round(((before - now) / before) * 100));
    }
  });

  test('una prenda sin rebaja se ve como antes: sin insignia ni precio tachado', async ({ page }) => {
    await open(page, '/hombre');
    const plain = card(page, 'Polo piqué básico');
    await expect(plain).toBeVisible();
    await expect(plain.getByTestId('discount-badge')).toHaveCount(0);
    await expect(plain.getByTestId('card-price-before')).toHaveCount(0);
    await expect(plain.getByTestId('card-price')).toContainText('29,90');
  });

  test('la insignia va arriba a la izquierda de la imagen y no se solapa con las otras', async ({ page }) => {
    await open(page, '/hombre');
    const target = card(page, 'Abrigo de paño gris');
    const image = await target.locator('img').first().boundingBox();
    const badge = await target.getByTestId('discount-badge').boundingBox();
    expect(image && badge).toBeTruthy();
    if (!image || !badge) return;
    expect(badge.x - image.x).toBeLessThanOrEqual(16);
    expect(badge.y - image.y).toBeLessThanOrEqual(16);
    const spans = await target.locator('div.absolute.left-3.top-3 > span').evaluateAll((items) =>
      items.map((item) => {
        const r = item.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    );
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i];
        const b = spans[j];
        const overlap = a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `insignias ${i} y ${j}`).toBe(false);
      }
    }
  });

  test('contraste AA: la insignia (accent-fg sobre accent) y el precio anterior (fg-muted sobre la tarjeta)', async ({ page }) => {
    await open(page, '/hombre');
    const target = card(page, 'Abrigo de paño gris');
    const badge = target.getByTestId('discount-badge');
    const [fg, bg] = await badge.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(contrast(fg ?? '', bg ?? ''), 'insignia').toBeGreaterThanOrEqual(4.5);
    const before = target.getByTestId('card-price-before');
    const [beforeFg, cardBg] = await before.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el.closest('article') as Element).backgroundColor]);
    expect(contrast(beforeFg ?? '', cardBg ?? ''), 'precio anterior').toBeGreaterThanOrEqual(4.5);
  });

  test('el nombre accesible del precio dice «Ahora …, antes …»', async ({ page }) => {
    await open(page, '/hombre');
    const text = await card(page, 'Abrigo de paño gris').getByTestId('card-price').evaluate((el) => el.textContent ?? '');
    expect(normalize(text)).toBe('Ahora 89,90 €, antes 119,90 €');
  });

  test('el orden por precio sigue usando el precio actual', async ({ page }) => {
    await open(page, '/hombre?orden=precio-asc');
    const prices = await page.locator('article').evaluateAll((cards) =>
      cards.map((c) => {
        const now = c.querySelector('[data-testid="card-price"] span.font-bold, p[data-testid="card-price"]');
        const match = /(\d+),(\d{2})/.exec(now?.textContent ?? '');
        return match ? Number(match[1]) * 100 + Number(match[2]) : Number.NaN;
      }),
    );
    expect(prices.length).toBeGreaterThan(3);
    expect(prices.every((p, i) => i === 0 || p >= (prices[i - 1] ?? 0))).toBe(true);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal y sin tarjetas cortadas a ${width} px`, async ({ page }) => {
      await open(page, '/hombre', width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const target = card(page, 'Abrigo de paño gris');
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 0.5);
      const price = await target.getByTestId('card-price').boundingBox();
      expect((price?.x ?? 0) + (price?.width ?? 0)).toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0) + 0.5);
    });
  }
});
