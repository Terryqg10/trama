import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// SPEC-001 T-032: checkout (RF-06, CA-09, CA-10). El flujo llega hasta la redirección a Stripe (modo
// test); no se completa el pago en la página de Stripe. Crea usuarios y pedidos de prueba reales.
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

const admin = adminClient();
const createdEmails: string[] = [];
const NEGRO_M = '/producto/polo-pique-basico?color=negro&talla=M';

test.afterAll(async () => {
  for (const email of createdEmails) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = listed.data.users.find((candidate) => candidate.email === email);
    if (user) {
      // Los pedidos de prueba (y sus reservas) se borran antes que la cuenta, que los dejaría huérfanos.
      await admin.from('orders').delete().eq('user_id', user.id);
    }
    await deleteUserByEmail(admin, email);
  }
});

async function newUser(label: string): Promise<{ credentials: Credentials; id: string }> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  return { credentials, id };
}

async function addAddress(userId: string): Promise<void> {
  const inserted = await admin.from('addresses').insert({
    user_id: userId,
    recipient_name: 'Ana Pérez',
    line1: 'Calle Mayor 1',
    postal_code: '28001',
    city: 'Madrid',
    province: 'Madrid',
  });
  if (inserted.error) throw new Error(`addAddress: ${inserted.error.message}`);
}

async function login(page: Page, credentials: Credentials, expected: RegExp): Promise<void> {
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(expected);
}

async function addToCart(page: Page): Promise<void> {
  await page.goto(NEGRO_M);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByText('Polo piqué básico añadido al carrito.')).toBeVisible();
}

async function pendingOrder(userId: string): Promise<{ id: string; total_cents: number; shipping_cents: number } | null> {
  const rows = await admin
    .from('orders')
    .select('id, total_cents, shipping_cents')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false })
    .limit(1);
  const parsed = z
    .array(z.object({ id: z.string(), total_cents: z.number(), shipping_cents: z.number() }))
    .parse(rows.data ?? []);
  return parsed[0] ?? null;
}

test.describe('acceso al checkout', () => {
  test('un invitado inicia sesión desde el carrito y vuelve al checkout con su carrito', async ({ page }) => {
    const { credentials } = await newUser('invitado');

    await addToCart(page);
    await page.goto('/carrito');
    await page.getByTestId('cart-checkout').click();
    await expect(page).toHaveURL(/\/acceso\?siguiente=%2Fcheckout$/);

    await login(page, credentials, /\/checkout(\?carrito=fusionado)?$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra' })).toBeVisible();
    await expect(page.getByText('Polo piqué básico')).toBeVisible();
    await expect(page.getByTestId('checkout-subtotal')).toContainText('29,90');
    // La fusión ya se hizo en el servidor y el carrito del navegador se vació.
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('trama.cart.v1'))).toBeNull();
  });

  test('sin sesión, /checkout lleva al acceso', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/acceso/);
  });

  test('el destino tras el login es una lista blanca: un destino ajeno se ignora', async ({ page }) => {
    const { credentials } = await newUser('destino');
    await page.goto('/acceso?siguiente=https://example.com');
    await login(page, credentials, /\/cuenta$/);
  });
});

test.describe('pago con Stripe en modo test (CA-09, CA-10)', () => {
  test('con dirección y carrito redirige a Stripe y deja un pedido pendiente con reserva', async ({ page }) => {
    const { credentials, id } = await newUser('pago');
    await addAddress(id);
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await addToCart(page);

    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-total')).toContainText('34,85');
    await expect(page.getByTestId('checkout-shipping')).toContainText('4,95');

    // El formulario solo envía el id de la dirección: aunque se le añada un precio, se ignora (CA-10).
    await page.evaluate(() => {
      const form = document.querySelector('form');
      for (const name of ['price', 'total_cents']) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = '1';
        form?.appendChild(field);
      }
    });
    await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });

    const order = await pendingOrder(id);
    expect(order).not.toBeNull();
    expect(order?.total_cents).toBe(2990 + 495);
    const reservations = await admin.from('stock_reservations').select('status, qty').eq('order_id', order?.id ?? '');
    expect(reservations.data).toEqual([{ status: 'activa', qty: 1 }]);
  });

  test('volver desde Stripe sin pagar libera la reserva y cancela el pedido pendiente', async ({ page }) => {
    const { credentials, id } = await newUser('cancelar');
    await addAddress(id);
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await addToCart(page);
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });
    const order = await pendingOrder(id);
    expect(order).not.toBeNull();

    await page.goto(`/checkout?cancelado=${order?.id}`);
    await expect(page.getByText('Has vuelto sin pagar.')).toBeVisible();
    const after = await admin.from('orders').select('status').eq('id', order?.id ?? '').single();
    expect(after.data).toEqual({ status: 'cancelado' });
    const reservations = await admin.from('stock_reservations').select('status').eq('order_id', order?.id ?? '');
    expect(reservations.data).toEqual([{ status: 'liberada' }]);
  });

  test('sin dirección guardada se pide añadir una y no hay botón de pago', async ({ page }) => {
    const { credentials } = await newUser('sindireccion');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await addToCart(page);
    await page.goto('/checkout');
    await expect(page.getByText('Necesitas una dirección de envío')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Añadir dirección' })).toBeVisible();
  });

  test('con el carrito vacío, /checkout vuelve al carrito', async ({ page }) => {
    const { credentials } = await newUser('vacio');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/carrito$/);
  });

  test('si el stock bajó por debajo de la cantidad, se bloquea el pago y se indica la variante', async ({ page }) => {
    const { credentials, id } = await newUser('stock');
    await addAddress(id);
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await addToCart(page);
    // Se fuerza una cantidad superior al stock en la cuenta (simula que el stock bajó).
    const cart = await admin.from('carts').select('id').eq('user_id', id).single();
    const cartId = z.object({ id: z.string() }).parse(cart.data).id;
    await admin.from('cart_items').update({ qty: 50 }).eq('cart_id', cartId);

    await page.goto('/checkout');
    const alert = page.locator('main').getByRole('alert');
    await expect(alert).toContainText('Polo piqué básico, talla M, color negro');
    await expect(alert).toContainText('solo quedan 8');
    await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toHaveCount(0);
  });
});

test.describe('página de gracias', () => {
  test('un pedido ajeno da 404', async ({ page }) => {
    const { credentials, id } = await newUser('gracias');
    const other = await newUser('gracias-otro');
    const created = await admin
      .from('orders')
      .insert({ user_id: other.id, total_cents: 1000, shipping_cents: 495, shipping_address: { country: 'ES' } })
      .select('id')
      .single();
    const orderId = z.object({ id: z.string() }).parse(created.data).id;

    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    const response = await page.goto(`/pedido/${orderId}/gracias`);
    expect(response?.status()).toBe(404);
    expect(id).not.toBe(other.id);
  });
});

test.describe('responsive del checkout', () => {
  test('a 320, 375, 768 y 1280 px no desborda y los controles miden al menos 44 px', async ({ page }) => {
    const { credentials, id } = await newUser('responsive');
    await addAddress(id);
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await addToCart(page);

    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/checkout');
      await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeVisible();

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `scroll horizontal de ${overflow}px a ${width}px`).toBeLessThanOrEqual(1);

      for (const control of [
        page.getByRole('button', { name: 'Pagar con tarjeta' }),
        page.getByRole('link', { name: 'Añadir otra dirección' }),
        page.locator('label').filter({ hasText: 'Ana Pérez' }),
      ]) {
        const box = await control.boundingBox();
        expect(box?.height ?? 0, `control a ${width}px`).toBeGreaterThanOrEqual(43.5);
        expect((box?.x ?? 0) + (box?.width ?? 0), `control fuera del viewport a ${width}px`).toBeLessThanOrEqual(width + 1);
      }
    }
  });
});
