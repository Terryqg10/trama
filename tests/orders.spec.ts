import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { z } from 'zod';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// SPEC-001 T-020: historial de pedidos (RF-08, CA-14). Crea usuarios y pedidos de prueba reales.
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

const admin = adminClient();
const createdEmails: string[] = [];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.afterAll(async () => {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const email of createdEmails) {
    const user = listed.data.users.find((candidate) => candidate.email === email);
    if (user) await admin.from('orders').delete().eq('user_id', user.id);
    await deleteUserByEmail(admin, email);
  }
});

async function newUser(label: string): Promise<{ credentials: Credentials; id: string }> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  return { credentials, id };
}

async function createOrder(userId: string, status: string, total: number, qty: number): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({
      user_id: userId,
      status,
      total_cents: total,
      shipping_cents: total >= 5000 ? 0 : 495,
      shipping_address: {
        recipient_name: 'Ana Pérez',
        line1: 'Calle Mayor 1',
        line2: null,
        postal_code: '28001',
        city: 'Madrid',
        province: 'Madrid',
        country: 'ES',
      },
    })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createOrder: ${inserted.error.message}`);
  const id = z.object({ id: z.string() }).parse(inserted.data).id;
  const item = await admin.from('order_items').insert({
    order_id: id,
    variant_id: crypto.randomUUID(),
    product_name: 'Polo piqué básico',
    size: 'M',
    color: 'negro',
    qty,
    unit_price_cents: 2990,
  });
  if (item.error) throw new Error(`createOrderItem: ${item.error.message}`);
  return id;
}

async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
}

test.describe('historial de pedidos (CA-14, test orders-isolation)', () => {
  test('A solo ve sus pedidos y B nunca aparece; el detalle ajeno da 404', async ({ page }) => {
    const a = await newUser('pedidos-a');
    const b = await newUser('pedidos-b');
    const orderA1 = await createOrder(a.id, 'pagado', 5985, 2);
    const orderA2 = await createOrder(a.id, 'pendiente', 3485, 1);
    const orderB = await createOrder(b.id, 'enviado', 3485, 1);

    await login(page, a.credentials);
    await page.getByRole('link', { name: 'Mis pedidos' }).click();
    await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
    await expect(page.getByTestId('order-row')).toHaveCount(2);

    const text = await page.locator('main').innerText();
    expect(text).toContain(orderA1.slice(0, 8).toUpperCase());
    expect(text).toContain(orderA2.slice(0, 8).toUpperCase());
    expect(text).not.toContain(orderB.slice(0, 8).toUpperCase());
    await expect(page.getByTestId('order-status').filter({ hasText: 'Pagado' })).toHaveCount(1);
    await expect(page.getByTestId('order-status').filter({ hasText: 'Pendiente de pago' })).toHaveCount(1);

    // Detalle propio.
    await page.goto(`/cuenta/pedidos/${orderA1}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(orderA1.slice(0, 8).toUpperCase());
    await expect(page.getByText('2 × Polo piqué básico')).toBeVisible();
    await expect(page.getByTestId('order-total')).toContainText('59,85');
    await expect(page.getByText('Calle Mayor 1')).toBeVisible();

    // Detalle ajeno e id inválido: 404, sin revelar nada.
    const foreign = await page.goto(`/cuenta/pedidos/${orderB}`);
    expect(foreign?.status()).toBe(404);
    const invalid = await page.goto('/cuenta/pedidos/no-es-un-id');
    expect(invalid?.status()).toBe(404);
  });

  test('sin sesión, el historial lleva al acceso', async ({ page }) => {
    await page.goto('/cuenta/pedidos');
    await expect(page).toHaveURL(/\/acceso$/);
  });

  test('sin pedidos se muestra el estado vacío con enlace al catálogo', async ({ page }) => {
    const user = await newUser('pedidos-vacio');
    await login(page, user.credentials);
    await page.goto('/cuenta/pedidos');
    await expect(page.getByText('Aún no has hecho pedidos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver novedades' })).toBeVisible();
  });

  test('la página de gracias enlaza al detalle del pedido', async ({ page }) => {
    const user = await newUser('pedidos-gracias');
    const order = await createOrder(user.id, 'pagado', 3485, 1);
    await login(page, user.credentials);
    await page.goto(`/pedido/${order}/gracias`);
    await page.getByRole('link', { name: 'Ver mi pedido' }).click();
    await expect(page).toHaveURL(new RegExp(`/cuenta/pedidos/${order}$`));
  });
});

test.describe('interfaz del historial', () => {
  test('lista y detalle sin violaciones graves de axe y sin desbordes a 320, 375, 768 y 1280 px', async ({ page }) => {
    const user = await newUser('pedidos-ui');
    const order = await createOrder(user.id, 'pagado', 5985, 2);
    await createOrder(user.id, 'cancelado', 3485, 1);
    await login(page, user.credentials);

    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const url of ['/cuenta/pedidos', `/cuenta/pedidos/${order}`]) {
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow, `scroll horizontal de ${overflow}px en ${url} a ${width}px`).toBeLessThanOrEqual(1);
      }
    }

    for (const url of ['/cuenta/pedidos', `/cuenta/pedidos/${order}`]) {
      await page.goto(url);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
        `violaciones graves en ${url}`,
      ).toEqual([]);
    }
  });
});
