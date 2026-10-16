import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ACTION_NAV, LEGAL_NAV, MAIN_NAV } from '../src/lib/domain/navigation';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ROUTES = [
  '/',
  ...MAIN_NAV.map((item) => item.href),
  ACTION_NAV.cart.href,
  ACTION_NAV.account.href,
  ...LEGAL_NAV.map((item) => item.href),
];

test.describe('accesibilidad', () => {
  for (const route of ROUTES) {
    test(`${route} no tiene violaciones graves ni críticas`, async ({ page }) => {
      await page.goto(route);
      // Los listados del catálogo se cargan en streaming: se espera al contenido real.
      await expect(page.getByRole('status')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (serious.length > 0) {
        for (const v of serious) {
          console.error(`[a11y] ${v.id} (${v.impact}): ${v.help}`);
          for (const node of v.nodes.slice(0, 3)) {
            console.error(`  - ${node.target.join(' ')}`);
          }
        }
      }
      expect(serious, 'violaciones graves o críticas de axe').toEqual([]);
    });
  }

  const CATALOG_STATES: ReadonlyArray<readonly [string, string]> = [
    ['listado de mujer con filtros', '/mujer?categoria=blusas&ocasion=vestir'],
    ['estado vacío del listado', '/mujer?categoria=pantalones&color=burdeos'],
    ['filtros inválidos ignorados', '/hombre?genero=niño&min=-5'],
    ['novedades con género', '/novedades?genero=mujer'],
  ];

  for (const [label, url] of CATALOG_STATES) {
    test(`${label} no tiene violaciones graves`, async ({ page }) => {
      await page.goto(url);
      // Se analiza el contenido real, no el esqueleto de carga.
      await expect(page.getByRole('status')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(serious, `violaciones graves en ${url}`).toEqual([]);
    });
  }

  test('el panel de filtros abierto no tiene violaciones graves', async ({ page }) => {
    await page.goto('/mujer');
    await expect(page.getByRole('status')).toHaveCount(0);
    const summary = page.locator('summary', { hasText: 'Filtros y orden' });
    if (await summary.isVisible()) await summary.click();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, 'violaciones graves con el panel abierto').toEqual([]);
  });

  test('el menú móvil abierto no tiene violaciones graves', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, 'violaciones graves o críticas de axe').toEqual([]);
  });

  test('respeta prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const hasInfiniteAnim = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const style = getComputedStyle(el);
        if (style.animationIterationCount === 'infinite') return true;
      }
      return false;
    });
    expect(hasInfiniteAnim).toBe(false);
    await context.close();
  });
});
