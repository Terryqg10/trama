import { test, expect } from '@playwright/test';
import { ACTION_NAV, LEGAL_NAV, MAIN_NAV } from '../src/lib/domain/navigation';

const SITE_ROUTES = [
  '/',
  ...MAIN_NAV.map((item) => item.href),
  ACTION_NAV.cart.href,
  ACTION_NAV.account.href,
];

test.describe('páginas legales (CA-34, test legal-pages)', () => {
  for (const route of SITE_ROUTES) {
    test(`el pie de ${route} muestra los cuatro enlaces legales`, async ({ page }) => {
      await page.goto(route);
      const legal = page.getByRole('navigation', { name: 'Legal' });
      for (const item of LEGAL_NAV) {
        await expect(legal.getByRole('link', { name: item.label })).toHaveAttribute(
          'href',
          item.href,
        );
      }
    });
  }

  for (const item of LEGAL_NAV) {
    test(`${item.href} responde 200, avisa de contenido ficticio y vuelve a /`, async ({
      page,
    }) => {
      const response = await page.goto(item.href);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('note')).toContainText('Contenido ficticio sin valor jurídico');

      await page.getByRole('link', { name: 'Volver al inicio' }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test(`el enlace del pie lleva a ${item.href}`, async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('navigation', { name: 'Legal' })
        .getByRole('link', { name: item.label })
        .click();
      await expect(page).toHaveURL(new RegExp(`${item.href}$`));
    });
  }

  test('los enlaces del pie miden al menos 44 px de alto', async ({ page }) => {
    await page.goto('/');
    const links = page.getByRole('navigation', { name: 'Legal' }).getByRole('link');
    const count = await links.count();
    expect(count).toBe(LEGAL_NAV.length);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('coherencia del contenido con la spec', () => {
  test('privacidad: datos previstos, proveedores y estado actual', async ({ page }) => {
    await page.goto('/privacidad');
    const text = await page.locator('article').innerText();
    for (const expected of ['Email', 'Nombre', 'Direcciones de envío', 'Pedidos', 'Supabase', 'Stripe']) {
      expect(text).toContain(expected);
    }
    expect(text).toContain('Las cuentas de usuario ya están activas');
  });

  test('cookies: solo técnicas, sin analítica ni publicidad', async ({ page }) => {
    await page.goto('/cookies');
    const text = await page.locator('article').innerText();
    expect(text).toContain('Solo cookies técnicas');
    expect(text).toContain('No usamos cookies de analítica');
    expect(text).toContain('almacenamiento local de tu navegador');
  });

  test('condiciones: importes y plazo salen de las constantes de tienda', async ({ page }) => {
    await page.goto('/condiciones');
    const text = await page.locator('article').innerText();
    expect(text).toContain('4,95');
    expect(text).toContain('50,00');
    expect(text).toContain('30 días');
    expect(text).toContain('modo de prueba');
  });

  test('no se afirman datos de titular inventados (NIF, CIF ni dirección)', async ({ page }) => {
    for (const item of LEGAL_NAV) {
      await page.goto(item.href);
      const text = await page.locator('article').innerText();
      expect(text, item.href).not.toMatch(/\b(NIF|CIF)\s*[:\-]?\s*[A-Z0-9]{8,9}\b/);
    }
  });
});
