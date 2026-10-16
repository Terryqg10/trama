import { test, expect } from '@playwright/test';

const WIDTHS = [320, 375, 768, 1280];

const STRUCTURAL = ['header', 'nav', 'main', 'footer'];

const ACCOUNT_ROUTES = ['/acceso', '/registro', '/recuperar'];

test.describe('responsive: pantallas de acceso (T-017)', () => {
  for (const width of WIDTHS) {
    for (const route of ACCOUNT_ROUTES) {
      test(`${route} no desborda a ${width}px y sus campos miden al menos 44 px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow, `scroll horizontal de ${overflow}px en ${route} a ${width}px`).toBeLessThanOrEqual(1);

        const form = page.locator('main form');
        const box = await form.boundingBox();
        expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);

        const controls = form.locator('input:not([type="hidden"]), button[type="submit"]');
        const count = await controls.count();
        for (let i = 0; i < count; i++) {
          const control = await controls.nth(i).boundingBox();
          expect(control?.height ?? 0, `control ${i} de ${route} a ${width}px`).toBeGreaterThanOrEqual(43.5);
        }
      });
    }
  }
});

test.describe('responsive', () => {
  for (const width of WIDTHS) {
    test(`no hay desbordamiento estructural a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      // 1. Ningún elemento estructural se sale del viewport.
      for (const selector of STRUCTURAL) {
        const elements = page.locator(selector);
        const count = await elements.count();
        for (let i = 0; i < count; i++) {
          const box = await elements.nth(i).boundingBox();
          if (!box) continue;
          expect(
            box.x,
            `${selector}[${i}] empieza fuera del viewport a ${width}px (x=${box.x})`,
          ).toBeGreaterThanOrEqual(-1);
          expect(
            box.x + box.width,
            `${selector}[${i}] termina fuera del viewport a ${width}px (right=${box.x + box.width} > ${width})`,
          ).toBeLessThanOrEqual(width + 1);
        }
      }

      // 2. El documento no genera scroll horizontal (con margen de 1px
      //    por redondeos de subpíxel).
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `scroll horizontal de ${overflow}px a ${width}px`).toBeLessThanOrEqual(1);
    });
  }
});
