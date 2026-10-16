import { test, expect, type Page } from '@playwright/test';

// SPEC-001 Enmiendas 8 y 9 / T-016: rejilla del listado (CA-54 y CA-55).

const ROUTES = ['/mujer', '/hombre', '/novedades'] as const;

async function open(page: Page, url: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible();
}

/** Columnas = posiciones x distintas de las tarjetas de la primera fila. */
async function columns(page: Page): Promise<{ count: number; minWidth: number }> {
  const boxes = await page.locator('article').evaluateAll((cards) =>
    cards.map((card) => {
      const r = card.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: r.width };
    }),
  );
  const firstRowY = Math.min(...boxes.map((b) => b.y));
  const firstRow = boxes.filter((b) => Math.abs(b.y - firstRowY) <= 2);
  return {
    count: new Set(firstRow.map((b) => b.x)).size,
    minWidth: Math.min(...boxes.map((b) => b.width)),
  };
}

test.describe('CA-54: 2 columnas por debajo de 768 px y 3 desde 768 px', () => {
  for (const [width, expected] of [
    [320, 2],
    [375, 2],
    [767, 2],
    [768, 3],
    [1023, 3],
  ] as const) {
    test(`a ${width} px: ${expected} columnas`, async ({ page }) => {
      await open(page, '/mujer', width);
      expect((await columns(page)).count).toBe(expected);
    });
  }

  for (const route of ROUTES) {
    test(`${route} a 768 px usa la rejilla de varias columnas`, async ({ page }) => {
      await open(page, route, 768);
      expect((await columns(page)).count).toBeGreaterThanOrEqual(2);
    });
  }
});

test.describe('CA-55: con la columna lateral, 3 columnas de al menos 200 px', () => {
  for (const width of [1024, 1280, 1440]) {
    test(`a ${width} px`, async ({ page }) => {
      await open(page, '/mujer', width);
      await expect(page.locator('[data-testid="filters-sidebar"]')).toBeVisible();
      const { count, minWidth } = await columns(page);
      expect(count).toBe(3);
      expect(minWidth, `ancho mínimo de tarjeta a ${width} px`).toBeGreaterThanOrEqual(200);
    });
  }
});

test.describe('las tarjetas a 3 columnas no se desbordan', () => {
  test('título, precio y etiqueta caben dentro de la tarjeta a 768 px', async ({ page }) => {
    await open(page, '/mujer', 768);
    const overflowing = await page.locator('article').evaluateAll((cards) =>
      cards
        .map((card, index) => {
          const box = card.getBoundingClientRect();
          const outside = [...card.querySelectorAll('h2, p, span')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5);
          });
          return outside.length > 0 ? index : -1;
        })
        .filter((index) => index >= 0),
    );
    expect(overflowing, 'tarjetas con contenido fuera de su caja').toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
