import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('la home carga y tiene un título', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveTitle(/.+/);
  });

  test('si hay cabecera, el logo enlaza a /', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    if ((await header.count()) === 0) return;
    const logoLink = header.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();
  });

  test('no hay enlaces vacíos (href="#" o href="")', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).not.toBe('#');
      expect(href).not.toBe('');
    }
  });
});
