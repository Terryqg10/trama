import { expect, test, type Page } from '@playwright/test';

// CA-149 (T-118, Enmienda 48 de SPEC-001): botón «Volver arriba».

const button = (page: Page) => page.getByTestId('scroll-to-top');

async function open(page: Page, url: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(url);
  await expect(page.getByRole('main')).toBeVisible();
  // Con la página hidratada el botón reacciona al scroll.
  await expect(page.locator('header input[data-ready="true"]').first()).toBeAttached();
}

test.describe('botón «Volver arriba» (CA-149)', () => {
  test('aparece al bajar, mide 44 px, sube arriba, deja el foco en el logo y desaparece', async ({ page }) => {
    await open(page, '/hombre', 1280);
    await expect(button(page)).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(button(page)).toBeVisible();
    const box = await button(page).boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await button(page).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(button(page)).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: 'Trama, ir al inicio' })).toBeFocused();
  });

  // En la ficha en móvil manda el «Volver arriba» de la barra fija (CA-74, `sticky-back-to-top.spec.ts`): el global no se duplica.
  test('está en la portada y en la ficha desde 768 px; en la ficha en móvil solo hay uno (el de la barra fija)', async ({ page }) => {
    await open(page, '/', 375);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(button(page)).toBeVisible();

    await open(page, '/producto/polo-pique-basico', 375);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await expect(page.getByTestId('back-to-top')).toHaveAttribute('aria-hidden', 'false');
    await expect(button(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Volver arriba' })).toHaveCount(1);

    await open(page, '/producto/polo-pique-basico', 1280);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(button(page)).toBeVisible();
  });

  test('no hay scroll horizontal con el botón visible de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 768, 1280]) {
      await open(page, '/mujer', width);
      await page.evaluate(() => window.scrollTo(0, 1500));
      await expect(button(page)).toBeVisible();
      const box = await button(page).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0), `a ${width}px`).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
  });
});
