import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-140 (T-091, Enmienda 41): aviso de demostración en /registro y /checkout. Crea un usuario de prueba real con dirección y carrito; se borra al terminar.
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

const admin = adminClient();
const createdEmails: string[] = [];
const WIDTHS = [320, 375, 480, 640, 768, 1024, 1280];
const NEGRO_M = '/producto/polo-pique-basico?color=negro&talla=M';

test.afterAll(async () => {
  for (const email of createdEmails) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = listed.data.users.find((candidate) => candidate.email === email);
    if (user) await admin.from('orders').delete().eq('user_id', user.id);
    await deleteUserByEmail(admin, email);
  }
});

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function checkoutAsNewUser(page: Page): Promise<void> {
  const credentials: Credentials = newCredentials('demo-notice');
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  const inserted = await admin.from('addresses').insert({
    user_id: id,
    recipient_name: 'Ana Pérez',
    line1: 'Calle Mayor 1',
    postal_code: '28001',
    city: 'Madrid',
    province: 'Madrid',
  });
  if (inserted.error) throw new Error(`addAddress: ${inserted.error.message}`);
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto(NEGRO_M);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra' })).toBeVisible();
}

test.describe('/registro (CA-140)', () => {
  test('explica que no hace falta confirmar el email, como nota', async ({ page }) => {
    await page.goto('/registro');
    const note = page.getByTestId('demo-notice-register');
    await expect(note).toBeVisible();
    expect(await note.getAttribute('role')).toBe('note');
    await expect(note).toContainText('Demo: puedes registrarte con cualquier email, no hace falta confirmarlo.');
  });

  test('sin scroll horizontal ni recortes de 320 a 1280 px, y axe sin violaciones graves', async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/registro');
      await expect(page.getByTestId('demo-notice-register')).toBeVisible();
      expect(await overflow(page), `${width} px`).toBeLessThanOrEqual(1);
      const box = await page.getByTestId('demo-notice-register').boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} px`).toBe(true);
    }
    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});

test.describe('/checkout (CA-140)', () => {
  test('junto al botón de pago está la tarjeta de prueba, con fecha y CVC cualquiera, y se puede copiar', async ({ page }) => {
    // El portapapeles real depende del navegador y de los permisos: se sustituye por uno que apunta lo copiado.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            window.sessionStorage.setItem('copied', text);
          },
        },
      });
    });
    await checkoutAsNewUser(page);
    const note = page.getByTestId('demo-notice-checkout');
    await expect(note).toBeVisible();
    expect(await note.getAttribute('role')).toBe('note');
    await expect(page.getByTestId('demo-card-number')).toHaveText('4242 4242 4242 4242');
    await expect(note).toContainText('cualquier fecha futura');
    await expect(note).toContainText('cualquier CVC');
    // Después del botón de pago y dentro de la misma columna.
    const pay = await page.getByRole('button', { name: 'Pagar con tarjeta' }).boundingBox();
    const box = await note.boundingBox();
    expect(pay && box && box.y >= pay.y).toBe(true);
    // El botón de copiar mide 44 px, no envía el formulario y lo anuncia.
    const copy = page.getByTestId('demo-notice-copy');
    const copyBox = await copy.boundingBox();
    expect(copyBox?.height).toBeGreaterThanOrEqual(43.9);
    const url = page.url();
    await copy.click();
    await expect(page.getByTestId('demo-notice-status')).toHaveText('Copiado.');
    expect(await page.evaluate(() => window.sessionStorage.getItem('copied'))).toBe('4242 4242 4242 4242');
    expect(page.url()).toBe(url);
  });

  test('si el portapapeles falla lo dice y el número sigue visible', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('denegado');
          },
        },
      });
    });
    await checkoutAsNewUser(page);
    await page.getByTestId('demo-notice-copy').click();
    await expect(page.getByTestId('demo-notice-status')).toContainText('No se pudo copiar');
    await expect(page.getByTestId('demo-card-number')).toBeVisible();
  });

  test('sin scroll horizontal ni recortes de 320 a 1280 px, y axe sin violaciones graves', async ({ page }) => {
    await checkoutAsNewUser(page);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByTestId('demo-notice-checkout')).toBeVisible();
      expect(await overflow(page), `${width} px`).toBeLessThanOrEqual(1);
      const box = await page.getByTestId('demo-notice-checkout').boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} px`).toBe(true);
    }
    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
