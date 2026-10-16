import { test, expect } from '@playwright/test';

const WIDTHS = [320, 375, 768, 1280];

const STRUCTURAL = ['header', 'nav', 'main', 'footer'];

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
