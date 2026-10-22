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

// CA-123 (T-083, Enmienda 36): más aire entre las tarjetas del listado (gap-6 = 24 px).
test.describe('CA-123: tarjetas separadas por 24 px', () => {
  for (const [width, columnsExpected] of [
    [320, 2],
    [375, 2],
    [767, 2],
    [768, 3],
    [1023, 3],
    [1280, 3],
  ] as const) {
    test(`a ${width} px: ${columnsExpected} columnas con 24 px de hueco en horizontal y en vertical`, async ({ page }) => {
      await open(page, '/mujer', width);
      const boxes = await page.locator('article').evaluateAll((cards) =>
        cards.map((card) => {
          const r = card.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
        }),
      );
      expect(new Set(boxes.filter((b) => Math.abs(b.top - (boxes[0]?.top ?? 0)) <= 2).map((b) => Math.round(b.left))).size).toBe(columnsExpected);
      const row = boxes.filter((b) => Math.abs(b.top - (boxes[0]?.top ?? 0)) <= 2).sort((a, b) => a.left - b.left);
      for (let i = 1; i < row.length; i++) {
        expect((row[i]?.left ?? 0) - (row[i - 1]?.right ?? 0), `hueco horizontal ${i}`).toBeCloseTo(24, 0);
      }
      const secondRowTop = Math.min(...boxes.filter((b) => b.top > (boxes[0]?.bottom ?? 0) - 2).map((b) => b.top));
      const firstRowBottom = Math.max(...boxes.filter((b) => Math.abs(b.top - (boxes[0]?.top ?? 0)) <= 2).map((b) => b.bottom));
      expect(secondRowTop - firstRowBottom, 'hueco vertical').toBeCloseTo(24, 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('con los filtros ocultos son 4 columnas con el mismo hueco', async ({ page }) => {
    await open(page, '/mujer', 1280);
    await page.getByTestId('filters-toggle').click();
    await expect(page.getByTestId('filters-sidebar')).toBeHidden();
    const lefts = await page.locator('article').evaluateAll((cards) => {
      const top = cards[0]?.getBoundingClientRect().top ?? 0;
      return cards
        .filter((c) => Math.abs(c.getBoundingClientRect().top - top) <= 2)
        .map((c) => ({ left: c.getBoundingClientRect().left, right: c.getBoundingClientRect().right }));
    });
    expect(lefts).toHaveLength(4);
    for (let i = 1; i < lefts.length; i++) expect((lefts[i]?.left ?? 0) - (lefts[i - 1]?.right ?? 0)).toBeCloseTo(24, 0);
  });

  test('la rejilla de la portada no cambia (16 px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const gap = await page.getByTestId('new-arrivals').locator('ul').evaluate((el) => getComputedStyle(el).columnGap);
    expect(gap).toBe('16px');
  });
});
