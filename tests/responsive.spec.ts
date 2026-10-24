import { test, expect } from '@playwright/test';

// Barrido de anchos: los saltos de layout fallan entre breakpoints, no en
// ellos. Incluye los cuatro anchos contractuales (320, 375, 768, 1280) y
// valores intermedios y a ambos lados de cada breakpoint (--bp-*).
const WIDTHS = [
  320, 360, 375, 414, 480, 512, 576, 639, 640, 700, 767, 768, 900, 1023, 1024, 1100, 1279, 1280,
];

const STRUCTURAL = ['header', 'nav', 'main', 'footer'];

type Offender = { path: string; left: number; right: number; reason: string };

const ACCOUNT_WIDTHS = [320, 375, 768, 1280];
const ACCOUNT_ROUTES = ['/acceso', '/registro', '/recuperar'];

test.describe('responsive: pantallas de acceso (T-017)', () => {
  for (const width of ACCOUNT_WIDTHS) {
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

test.describe('responsive: /ofertas (T-100, CA-05)', () => {
  for (const width of WIDTHS) {
    test(`/ofertas no desborda a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/ofertas');
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal de ${overflow}px en /ofertas a ${width}px`).toBeLessThanOrEqual(1);
      const banner = await page.getByTestId('offers-banner').boundingBox();
      expect((banner?.x ?? 0) + (banner?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    });
  }
});

test.describe('responsive', () => {
  for (const width of WIDTHS) {
    test(`sin desbordamiento ni contenido recortado a ${width}px`, async ({ page }) => {
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

      // 2. El documento no genera scroll horizontal (margen de 1px por subpíxel).
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `scroll horizontal de ${overflow}px a ${width}px`).toBeLessThanOrEqual(1);

      // 3. Ningún descendiente visible se sale del viewport ni queda recortado
      //    por un ancestro con overflow oculto. Esto atrapa el caso en que
      //    `overflow-x: hidden` en body/html esconde el desbordamiento del
      //    punto 2 y los enlaces del nav o un banner se cortan sin avisar.
      //    Excepciones: ancestros con scroll horizontal deliberado
      //    (overflow-x: auto|scroll) o marcados con `data-allow-overflow`.
      const offenders = await page.evaluate((vw): Offender[] => {
        const found: Offender[] = [];
        const roots = document.querySelectorAll('header, nav, main, footer');
        const seen = new Set<Element>();

        const describe = (el: Element): string => {
          const parts: string[] = [];
          let node: Element | null = el;
          while (node && parts.length < 4 && node.tagName !== 'BODY') {
            const id = node.id ? `#${node.id}` : '';
            const cls =
              typeof node.className === 'string' && node.className.trim()
                ? `.${node.className.trim().split(/\s+/)[0]}`
                : '';
            parts.unshift(`${node.tagName.toLowerCase()}${id}${cls}`);
            node = node.parentElement;
          }
          return parts.join(' > ');
        };

        const isExempt = (el: Element): boolean => {
          let node: Element | null = el;
          while (node && node !== document.documentElement) {
            if (node.hasAttribute('data-allow-overflow')) return true;
            const ox = getComputedStyle(node).overflowX;
            if (ox === 'auto' || ox === 'scroll') return true;
            node = node.parentElement;
          }
          return false;
        };

        const visit = (el: Element) => {
          if (seen.has(el)) return;
          seen.add(el);
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          // Texto solo para lectores de pantalla (sr-only): 1x1 px recortado a propósito.
          if (rect.width <= 1 && rect.height <= 1) return;
          if (isExempt(el)) return;

          if (rect.right > vw + 1 || rect.left < -1) {
            found.push({
              path: describe(el),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              reason: 'fuera del viewport',
            });
            return;
          }

          const clips = style.overflowX === 'hidden' || style.overflowX === 'clip';
          if (clips && el.scrollWidth - el.clientWidth > 1) {
            found.push({
              path: describe(el),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              reason: `contenido recortado (scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth})`,
            });
          }
        };

        roots.forEach((root) => {
          visit(root);
          root.querySelectorAll('*').forEach(visit);
        });
        return found;
      }, width);

      expect(
        offenders.slice(0, 10),
        `elementos desbordados o recortados a ${width}px`,
      ).toEqual([]);
    });
  }
});
