import { test, expect } from '@playwright/test';

test.describe('bloque de envío y devolución (CA-29, test shipping-policy-visible)', () => {
  // La portada tiene la sección «Compra con tranquilidad» (T-067); la ficha y el carrito, el bloque compacto «Envío y devolución».
  test('la home muestra tarifa, umbral y plazo de devolución', async ({ page }) => {
    await page.goto('/');
    const block = page.getByRole('region', { name: 'Compra con tranquilidad' });
    await expect(block).toBeVisible();
    await expect(block).toContainText('4,95');
    await expect(block).toContainText('50,00');
    await expect(block).toContainText('30 días');
  });

  test('las condiciones no se ocultan tras un asterisco', async ({ page }) => {
    await page.goto('/');
    const text = await page.getByRole('region', { name: 'Compra con tranquilidad' }).innerText();
    expect(text).not.toContain('*');
  });

  test('indica que la política es de ejemplo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Compra con tranquilidad' })).toContainText(
      'Condiciones de ejemplo',
    );
  });
});
