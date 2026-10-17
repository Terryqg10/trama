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

// SPEC-001 T-022: panel admin de pedidos (RF-10, CA-17) con el estilo v4-dense-workspace (ADR-008).
// Crea usuarios y pedidos de prueba reales; uno de los usuarios se promociona a admin con la clave de servicio.
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

async function newUser(label: string, role: 'customer' | 'admin' = 'customer'): Promise<{ credentials: Credentials; id: string }> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  if (role === 'admin') {
    const promoted = await admin.from('profiles').update({ role: 'admin' }).eq('id', id);
    if (promoted.error) throw new Error(`No se pudo promover al admin de prueba: ${promoted.error.message}`);
  }
  return { credentials, id };
}

async function createOrder(userId: string, status: string, recipient: string): Promise<string> {
  const inserted = await admin
    .from('orders')
    .insert({
      user_id: userId,
      status,
      total_cents: 5985,
      shipping_cents: 0,
      shipping_address: {
        recipient_name: recipient,
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
    qty: 2,
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

async function statusOf(orderId: string): Promise<string> {
  const row = await admin.from('orders').select('status').eq('id', orderId).single();
  return z.object({ status: z.string() }).parse(row.data).status;
}

test.describe('acceso al panel', () => {
  test('sin sesión lleva al acceso y un cliente no admin vuelve a la portada', async ({ page }) => {
    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/acceso$/);

    const customer = await newUser('admin-cliente');
    await login(page, customer.credentials);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Panel de administración' })).toHaveCount(0);
  });

  test('un admin ve el enlace en su cuenta, entra al panel y no ve la cabecera ni el pie de la tienda', async ({ page }) => {
    const adminUser = await newUser('admin-acceso', 'admin');
    await login(page, adminUser.credentials);
    await page.getByRole('link', { name: 'Panel de administración' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
    // Sin el marco de la tienda: ni su menú ni el pie legal.
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Legal' })).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('los tokens de v4 solo rigen dentro del panel: la tienda conserva los de v1 (ADR-008)', async ({ page }) => {
    const adminUser = await newUser('admin-tokens', 'admin');
    await login(page, adminUser.credentials);

    await page.goto('/');
    const shopRadius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius-control').trim());
    expect(shopRadius).toBe('9999px');

    await page.goto('/admin');
    const panelRadius = await page.evaluate(() => {
      const zone = document.querySelector('[data-style="v4"]');
      return zone ? getComputedStyle(zone).getPropertyValue('--radius-control').trim() : null;
    });
    expect(panelRadius).toMatch(/^0?\.5rem$/);
    const rootInPanel = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius-control').trim());
    expect(rootInPanel).toBe('9999px');
  });
});

test.describe('listado y detalle de pedidos', () => {
  test('el admin ve los pedidos de todos los clientes, filtra y busca', async ({ page }) => {
    const adminUser = await newUser('admin-lista', 'admin');
    const a = await newUser('admin-lista-a');
    const b = await newUser('admin-lista-b');
    const orderA = await createOrder(a.id, 'pagado', 'Alicia Alfa');
    const orderB = await createOrder(b.id, 'enviado', 'Berta Beta');

    await login(page, adminUser.credentials);
    await page.goto('/admin/pedidos');
    const rows = page.getByTestId('admin-order-row');
    await expect(rows.filter({ hasText: orderA.slice(0, 8).toUpperCase() })).toHaveCount(1);
    await expect(rows.filter({ hasText: orderB.slice(0, 8).toUpperCase() })).toHaveCount(1);

    // La cabecera de la tabla (sticky) no tapa la primera fila.
    await page.setViewportSize({ width: 1280, height: 800 });
    const headerBox = await page.getByTestId('admin-table-header').boundingBox();
    const firstRowBox = await rows.first().boundingBox();
    expect(headerBox && firstRowBox && headerBox.y + headerBox.height <= firstRowBox.y + 1).toBe(true);

    // Filtro por estado.
    await page.getByRole('link', { name: 'Enviado', exact: true }).click();
    await expect(page).toHaveURL(/estado=enviado/);
    await expect(rows.filter({ hasText: orderB.slice(0, 8).toUpperCase() })).toHaveCount(1);
    await expect(rows.filter({ hasText: orderA.slice(0, 8).toUpperCase() })).toHaveCount(0);

    // Búsqueda por destinatario (campo de la topbar) y por número.
    await page.goto('/admin/pedidos');
    await page.getByLabel('Buscar pedidos por número o destinatario').fill('alicia');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/q=alicia/);
    await expect(rows.filter({ hasText: 'Alicia Alfa' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Berta Beta' })).toHaveCount(0);

    await page.goto(`/admin/pedidos?q=${orderB.slice(0, 8)}`);
    await expect(rows.filter({ hasText: 'Berta Beta' })).toHaveCount(1);

    await page.goto('/admin/pedidos?q=zzzzzzzzzz');
    await expect(page.getByText('Ningún pedido coincide con el filtro')).toBeVisible();

    // Detalle.
    await page.goto(`/admin/pedidos/${orderA}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(orderA.slice(0, 8).toUpperCase());
    await expect(page.getByText('Polo piqué básico')).toBeVisible();
    await expect(page.getByText('Calle Mayor 1')).toBeVisible();
    await expect(page.getByTestId('order-total')).toContainText('59,85');
  });

  test('un pedido inexistente o un id inválido dan 404', async ({ page }) => {
    const adminUser = await newUser('admin-404', 'admin');
    await login(page, adminUser.credentials);
    const missing = await page.goto(`/admin/pedidos/${crypto.randomUUID()}`);
    expect(missing?.status()).toBe(404);
    const invalid = await page.goto('/admin/pedidos/no-es-un-id');
    expect(invalid?.status()).toBe(404);
  });
});

test.describe('cambio de estado (CA-17)', () => {
  test('el admin lleva un pedido de pagado a entregado y no hay más acciones', async ({ page }) => {
    const adminUser = await newUser('admin-flujo', 'admin');
    const customer = await newUser('admin-flujo-cliente');
    const order = await createOrder(customer.id, 'pagado', 'Clara Gamma');

    await login(page, adminUser.credentials);
    await page.goto(`/admin/pedidos/${order}`);
    await expect(page.getByTestId('order-status')).toContainText('Pagado');

    await page.getByRole('button', { name: 'Marcar como preparado' }).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Pedido en preparación');
    await expect.poll(() => statusOf(order)).toBe('preparado');
    await page.reload();
    await expect(page.getByTestId('order-status')).toContainText('En preparación');

    await page.getByRole('button', { name: 'Marcar como enviado' }).click();
    await expect.poll(() => statusOf(order)).toBe('enviado');
    await page.reload();
    await page.getByRole('button', { name: 'Marcar como entregado' }).click();
    await expect.poll(() => statusOf(order)).toBe('entregado');
    await page.reload();

    await expect(page.getByTestId('order-status')).toContainText('Entregado');
    await expect(page.getByText('No hay cambios de estado disponibles para este pedido.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Marcar como|Cancelar pedido/ })).toHaveCount(0);
  });

  test('cancelar un pedido pagado pide confirmación', async ({ page }) => {
    const adminUser = await newUser('admin-cancelar', 'admin');
    const customer = await newUser('admin-cancelar-cliente');
    const order = await createOrder(customer.id, 'pagado', 'Diana Delta');

    await login(page, adminUser.credentials);
    await page.goto(`/admin/pedidos/${order}`);
    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    await expect(page.getByText('¿Cancelar este pedido?')).toBeVisible();
    expect(await statusOf(order)).toBe('pagado');

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('¿Cancelar este pedido?')).toHaveCount(0);
    expect(await statusOf(order)).toBe('pagado');

    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    await page.getByRole('button', { name: 'Sí, cancelar pedido' }).click();
    await expect.poll(() => statusOf(order)).toBe('cancelado');
  });

  test('una transición no permitida enviada a mano se rechaza en el servidor', async ({ page }) => {
    const adminUser = await newUser('admin-manipulado', 'admin');
    const customer = await newUser('admin-manipulado-cliente');
    const order = await createOrder(customer.id, 'pagado', 'Elena Épsilon');

    await login(page, adminUser.credentials);
    await page.goto(`/admin/pedidos/${order}`);
    // Se altera el destino del botón «preparado» a «entregado» (saltarse estados) antes de pulsarlo.
    await page.getByRole('button', { name: 'Marcar como preparado' }).evaluate((button) => {
      if (button instanceof HTMLButtonElement) button.value = 'entregado';
    });
    await page.getByRole('button', { name: 'Marcar como preparado' }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('No se puede pasar un pedido de «Pagado» a «Entregado»');
    expect(await statusOf(order)).toBe('pagado');

    // Y uno entregado nunca vuelve a pagado: no tiene acciones y la BD sigue igual.
    const delivered = await createOrder(customer.id, 'entregado', 'Fátima Zeta');
    await page.goto(`/admin/pedidos/${delivered}`);
    await expect(page.getByRole('button', { name: /Marcar como/ })).toHaveCount(0);
    expect(await statusOf(delivered)).toBe('entregado');
  });
});

test.describe('estilo v4: navegación, densidad y accesibilidad', () => {
  test('a 1280 px hay sidebar y atajo Ctrl+K; en móvil la sidebar es un drawer cerrable', async ({ page }) => {
    const adminUser = await newUser('admin-nav', 'admin');
    await login(page, adminUser.credentials);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/pedidos');
    await expect(page.getByRole('navigation', { name: 'Administración', exact: true })).toBeVisible();
    await expect(page.getByTestId('admin-menu-open')).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(page.getByLabel('Buscar pedidos por número o destinatario')).toBeFocused();
    await expect(page.getByRole('link', { name: 'Trama, ir al inicio' }).first()).toHaveAttribute('href', '/');

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/admin/pedidos');
    await expect(page.getByRole('navigation', { name: 'Administración', exact: true })).toBeHidden();
    const open = page.getByTestId('admin-menu-open');
    await expect(open).toBeVisible();

    // Abre y cierra con Esc.
    await open.click();
    await expect(page.getByTestId('admin-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('admin-menu')).toBeHidden();

    // Cierra con el botón.
    await open.click();
    await page.getByTestId('admin-menu-close').click();
    await expect(page.getByTestId('admin-menu')).toBeHidden();

    // Cierra al navegar desde el drawer.
    await open.click();
    await page.getByRole('navigation', { name: 'Administración (móvil)' }).getByRole('link', { name: 'Resumen' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('admin-menu')).toBeHidden();
  });

  test('sin violaciones graves de axe y sin desbordes a 320, 375, 768 y 1280 px', async ({ page }) => {
    const adminUser = await newUser('admin-ui', 'admin');
    const customer = await newUser('admin-ui-cliente');
    const order = await createOrder(customer.id, 'pagado', 'Gloria Eta');
    await createOrder(customer.id, 'cancelado', 'Gloria Eta');
    await login(page, adminUser.credentials);

    const urls = ['/admin', '/admin/pedidos', `/admin/pedidos/${order}`];
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const url of urls) {
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow, `scroll horizontal de ${overflow}px en ${url} a ${width}px`).toBeLessThanOrEqual(1);
      }
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    for (const url of [...urls, '/admin/pedidos?q=zzzzzz']) {
      await page.goto(url);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
        `violaciones graves en ${url}`,
      ).toEqual([]);
    }
  });

  test('los controles cumplen la zona táctil (44 px en móvil, 32 px en escritorio) y el texto no baja de 12 px', async ({ page }) => {
    const adminUser = await newUser('admin-tactil', 'admin');
    const customer = await newUser('admin-tactil-cliente');
    const order = await createOrder(customer.id, 'pagado', 'Helena Theta');
    await login(page, adminUser.credentials);

    for (const [width, min] of [
      [375, 43.5],
      [1280, 31.5],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/admin/pedidos/${order}`);
      for (const control of [
        page.getByRole('button', { name: 'Marcar como preparado' }),
        page.getByRole('button', { name: 'Cancelar pedido' }),
        page.getByLabel('Buscar pedidos por número o destinatario'),
      ]) {
        const box = await control.boundingBox();
        expect(box?.height ?? 0, `control a ${width}px`).toBeGreaterThanOrEqual(min);
      }
      const smallest = await page.evaluate(() => {
        let result = Infinity;
        for (const element of document.querySelectorAll('main *, header *, aside *')) {
          if (element.childNodes.length === 0) continue;
          const hasText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
          if (!hasText) continue;
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          result = Math.min(result, Number.parseFloat(style.fontSize));
        }
        return result;
      });
      expect(smallest, `texto más pequeño a ${width}px`).toBeGreaterThanOrEqual(12);
    }
  });
});
