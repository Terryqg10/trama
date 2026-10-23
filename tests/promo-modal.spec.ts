import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { adminClient } from './helpers/auth-users';

// CA-127 a CA-131 (T-089, Enmienda 38): modal promocional de la portada. El resto de tests parte de `promo_seen` ya guardado (playwright.config.ts);
// aquí se vacía el almacenamiento para ver el modal. El alta real necesita newsletter_subscribers (T-058); los emails de prueba se borran.

test.use({ storageState: { cookies: [], origins: [] } });

const modal = (page: Page) => page.getByTestId('promo-modal');
const SHOWN = { timeout: 8_000 };

async function openHome(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('newsletter')).toBeAttached();
}

async function openModal(page: Page, width = 1280): Promise<void> {
  await openHome(page, width);
  await expect(modal(page)).toBeVisible(SHOWN);
  // Espera a que acabe la animación de entrada (0,3 s, con un desplazamiento vertical) antes de medir.
  await expect
    .poll(() => modal(page).evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
}

const testEmails: string[] = [];
test.afterAll(async () => {
  if (testEmails.length > 0) await adminClient().from('newsletter_subscribers').delete().in('email', testEmails);
});

test.describe('aparición (CA-127)', () => {
  test('sale a los 3 s en la portada, guarda promo_seen y no vuelve a salir al recargar', async ({ page }) => {
    await openHome(page);
    await expect(modal(page)).toBeVisible(SHOWN);
    expect(await page.evaluate(() => window.localStorage.getItem('promo_seen'))).toBe('1');
    await page.reload();
    await expect(page.getByTestId('newsletter')).toBeAttached();
    await page.waitForTimeout(3_500);
    await expect(modal(page)).toHaveCount(0);
  });

  test('no sale en otras páginas', async ({ page }) => {
    await page.goto('/mujer');
    await expect(page.locator('article').first()).toBeVisible();
    await page.waitForTimeout(3_500);
    await expect(modal(page)).toHaveCount(0);
  });
});

test.describe('contenido (CA-129)', () => {
  test('a 1280 px: dos columnas, texto a la izquierda y la foto a la derecha ocupando su columna', async ({ page }) => {
    await openModal(page, 1280);
    const text = await page.getByRole('heading', { name: 'Suscríbete y consigue un 10 % en tu primera compra' }).boundingBox();
    const image = page.getByTestId('promo-modal-image');
    await expect(image.locator('img')).toBeVisible();
    const box = await image.boundingBox();
    const dialog = await modal(page).boundingBox();
    expect(text && box && dialog).toBeTruthy();
    if (!text || !box || !dialog) return;
    expect(text.x).toBeLessThan(box.x);
    expect(Math.abs(box.x + box.width - (dialog.x + dialog.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - dialog.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height - (dialog.y + dialog.height))).toBeLessThanOrEqual(1);
    expect(await image.locator('img').getAttribute('src')).toContain('promo-regalo');
    await expect(modal(page)).toContainText('Te enviaremos el código de descuento por email.');
    await expect(modal(page).getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad');
    await expect(modal(page).getByRole('button', { name: 'Suscribirme' })).toBeVisible();
  });

  test('a 375 px: solo el texto, a ancho completo y sin scroll horizontal', async ({ page }) => {
    await openModal(page, 375);
    await expect(page.getByTestId('promo-modal-image')).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('sin scroll horizontal ni recortes de 320 a 1280 px', async ({ page }) => {
    await openModal(page, 1280);
    for (const width of [320, 375, 480, 640, 767, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width} px`).toBeLessThanOrEqual(1);
      const box = await modal(page).boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} px`).toBe(true);
    }
  });
});

test.describe('cierre y accesibilidad (CA-128)', () => {
  test('el foco entra, queda atrapado y el body no hace scroll; Esc cierra', async ({ page }) => {
    await openModal(page);
    await expect(modal(page)).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    const inside = () => page.evaluate(() => document.activeElement?.closest('[data-testid="promo-modal"]') !== null);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await inside()).toBe(true);
    await page.keyboard.press('Escape');
    await expect(modal(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });

  test('se cierra con la X (44 px) y con un clic en el fondo; un clic dentro no lo cierra', async ({ page }) => {
    await openModal(page);
    const close = page.getByTestId('promo-modal-close');
    const box = await close.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(43.9);
    expect(box?.height).toBeGreaterThanOrEqual(43.9);
    await modal(page).click({ position: { x: 5, y: 60 } });
    await expect(modal(page)).toBeVisible();
    await close.click();
    await expect(modal(page)).toHaveCount(0);
    await page.evaluate(() => window.localStorage.removeItem('promo_seen'));
    await page.reload();
    await expect(modal(page)).toBeVisible(SHOWN);
    await page.mouse.click(8, 8);
    await expect(modal(page)).toHaveCount(0);
  });

  test('con prefers-reduced-motion no hay animación', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openModal(page);
    expect(await modal(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });

  test('axe sin violaciones graves con el modal abierto', async ({ page }) => {
    await openModal(page);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});

test.describe('suscripción (CA-130)', () => {
  test('sin consentimiento y con un email mal formado muestra errores por campo', async ({ page }) => {
    await openModal(page);
    await modal(page).getByLabel('Email', { exact: true }).fill('no-es-un-email');
    await modal(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(modal(page).getByText('Introduce un email válido.')).toBeVisible();
    await expect(modal(page).getByText('Debes aceptar la política de privacidad para suscribirte.')).toBeVisible();
  });

  test('con email y consentimiento se suscribe y lo anuncia en la región aria-live', async ({ page }) => {
    const email = `t089-${randomUUID().slice(0, 8)}@example.com`;
    testEmails.push(email);
    await openModal(page);
    await modal(page).getByLabel('Email', { exact: true }).fill(email);
    await modal(page).getByRole('checkbox').check();
    await modal(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(modal(page).getByTestId('newsletter-message')).toContainText('¡Gracias por suscribirte!');
  });
});

test.describe('botón de prueba (CA-131)', () => {
  test('en la build de producción no existe', async ({ page }) => {
    await openHome(page);
    await expect(page.getByTestId('promo-test-button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Probar promo' })).toHaveCount(0);
  });
});
