import { test, expect } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// T-029: el helper que usan varios specs para comprobar «sin recarga» tiene que fallar de verdad
// cuando hay una recarga, y pasar en una navegación blanda. Si no, esos tests no probarían nada.

test.describe('helper no-reload', () => {
  test('detecta una recarga completa del documento', async ({ page }) => {
    await page.goto('/mujer');
    await markDocument(page);
    await expectNoReload(page);
    await page.reload();
    await expect(expectNoReload(page)).rejects.toThrow('el documento no se ha recargado');
  });

  test('detecta una navegación completa a otra URL', async ({ page }) => {
    await page.goto('/mujer');
    await markDocument(page);
    await page.goto('/hombre');
    await expect(expectNoReload(page)).rejects.toThrow();
  });

  test('no se confunde con una navegación blanda (el enlace de la cabecera)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/mujer');
    await markDocument(page);
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Hombre' }).click();
    await expect(page).toHaveURL(/\/hombre$/);
    await expectNoReload(page);
  });
});
