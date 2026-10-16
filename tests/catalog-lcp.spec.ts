import { test, expect } from '@playwright/test';

// SPEC-001 Enmienda 8 / T-015: la primera imagen del listado es la LCP y lleva prioridad (CA-53).
// El aviso de LCP de Next en consola no se prueba aquí: es intermitente cuando varias imágenes de
// la primera fila miden lo mismo (Enmienda 10 de SPEC-001; comprobación manual en la review).

const ROUTES = ['/mujer', '/hombre', '/novedades'] as const;

for (const route of ROUTES) {
  test.describe(`CA-53: ${route}`, () => {
    test('solo la primera imagen lleva prioridad alta y no está en diferido', async ({ page }) => {
      await page.goto(route);
      const images = page.locator('article img');
      await expect(images.first()).toBeVisible();
      expect(await images.count()).toBeGreaterThan(1);

      // (a) la primera
      await expect(images.nth(0)).toHaveAttribute('fetchpriority', 'high');
      expect(await images.nth(0).getAttribute('loading')).not.toBe('lazy');

      // (b) la segunda y el resto, sin prioridad alta
      const count = await images.count();
      for (let i = 1; i < count; i++) {
        expect(await images.nth(i).getAttribute('fetchpriority'), `imagen ${i + 1}`).not.toBe('high');
      }
    });
  });
}

test.describe('CA-53: el estado vacío no rompe', () => {
  test('sin productos no hay imágenes ni error', async ({ page }) => {
    await page.goto('/mujer?categoria=pantalones&color=burdeos');
    await expect(page.getByText('No hay productos con estos filtros')).toBeVisible();
    await expect(page.locator('article img')).toHaveCount(0);
  });
});
