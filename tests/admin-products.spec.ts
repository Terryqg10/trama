import { randomUUID } from 'node:crypto';
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

// SPEC-001 T-021: panel admin de productos, variantes y stock (RF-09, CA-15, CA-16), estilo v4 (ADR-008).
// Crea usuarios (uno admin) y productos de prueba reales y los borra al terminar.
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const admin = adminClient();
const createdEmails: string[] = [];
const slugs: string[] = [];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
// Solo letras: el filtro de color de la tienda acepta solo letras.
const COLOR = `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

test.afterAll(async () => {
  if (slugs.length > 0) await admin.from('products').delete().in('slug', slugs);
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

async function adminUser(label: string): Promise<Credentials> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  const id = await createConfirmedUser(admin, credentials);
  const promoted = await admin.from('profiles').update({ role: 'admin' }).eq('id', id);
  if (promoted.error) throw new Error(`No se pudo promover al admin de prueba: ${promoted.error.message}`);
  return credentials;
}

async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
}

async function fillProduct(page: Page, name: string): Promise<void> {
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  await page.getByLabel('Género').selectOption('hombre');
  await page.getByLabel('Categoría').selectOption('polos');
  await page.getByLabel('Ocasión').selectOption('casual');
  await page.getByLabel('Composición').fill('100% algodón');
  await page.getByLabel('Altura del modelo (cm)').fill('185');
  await page.getByLabel('Talla del modelo').fill('M');
}

async function addVariant(page: Page, size: string, price: string, stock: string): Promise<void> {
  const form = page.locator('form', { hasText: 'Añadir variante' });
  await form.getByLabel('Talla', { exact: true }).fill(size);
  await form.getByLabel('Color', { exact: true }).fill(COLOR);
  await form.getByLabel('Precio (€)').fill(price);
  await form.getByLabel('Stock', { exact: true }).fill(stock);
  await form.getByRole('button', { name: 'Añadir variante' }).click();
}

test.describe('acceso', () => {
  test('un cliente no admin no entra en el panel de productos', async ({ page }) => {
    const credentials = newCredentials('productos-cliente');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);
    await login(page, credentials);
    await page.goto('/admin/productos');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin/productos/nuevo');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('categorías nuevas en el panel (CA-79, T-044)', () => {
  test('el formulario ofrece las once categorías y crea un producto de una nueva sin error de base de datos', async ({ page }) => {
    const credentials = await adminUser('productos-categorias');
    await login(page, credentials);
    await page.goto('/admin/productos/nuevo');

    const values = await page.getByLabel('Categoría').locator('option').evaluateAll((options) =>
      options.map((option) => (option instanceof HTMLOptionElement ? option.value : '')),
    );
    // La primera opción es el marcador «Elige…» (valor vacío).
    expect(values.filter((value) => value !== '')).toEqual(['polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'abrigos', 'jerseis', 'faldas', 'tops']);

    const name = `Falda e2e ${COLOR}`;
    await page.getByLabel('Nombre', { exact: true }).fill(name);
    await page.getByLabel('Género').selectOption('mujer');
    await page.getByLabel('Categoría').selectOption('faldas');
    await page.getByLabel('Ocasión').selectOption('casual');
    const slug = `e2e-falda-${COLOR}`;
    slugs.push(slug);
    await page.getByLabel('URL (slug)').fill(slug);
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page).toHaveURL(/\/admin\/productos\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);

    const stored = await admin.from('products').select('category').eq('slug', slug).single();
    expect(stored.data?.category).toBe('faldas');
  });
});

test.describe('admin-create-product (CA-16)', () => {
  test('el admin crea un producto con variantes y aparece en el catálogo, y puede editarlo, ajustar el stock y darlo de baja', async ({ page }) => {
    const credentials = await adminUser('productos-crear');
    await login(page, credentials);

    const name = `Polo e2e ${COLOR}`;
    await page.goto('/admin/productos');
    await page.getByRole('link', { name: 'Nuevo producto' }).first().click();
    await expect(page).toHaveURL(/\/admin\/productos\/nuevo$/);

    // El slug se propone a partir del nombre y se puede cambiar.
    await fillProduct(page, name);
    const slugField = page.getByLabel('URL (slug)');
    await expect(slugField).toHaveValue(`polo-e2e-${COLOR}`);
    const slug = `e2e-${COLOR}`;
    slugs.push(slug);
    await slugField.fill(slug);
    await page.getByRole('button', { name: 'Crear producto' }).click();

    await expect(page).toHaveURL(/\/admin\/productos\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByTestId('product-state').first()).toHaveText('Activo');

    // Variantes: una de 29,90 € con 5 unidades y otra agotada.
    await addVariant(page, 'm', '29,90', '5');
    await expect(page.getByTestId('variant-row')).toHaveCount(1);
    await addVariant(page, 'L', '31', '0');
    await expect(page.getByTestId('variant-row')).toHaveCount(2);

    // Aparece en la ficha pública con su precio y sus tallas (L agotada).
    await page.goto(`/producto/${slug}?color=${COLOR}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('29,90 €').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'M', exact: true })).toBeVisible();
    await expect(page.locator('[aria-disabled="true"]', { hasText: 'L' })).toBeVisible();

    // Y en el listado de la tienda.
    await page.goto(`/hombre?color=${COLOR}`);
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();

    // Edita: sube el stock de la talla L y el precio de la M.
    await page.goto('/admin/productos');
    await page.getByRole('link', { name }).click();
    const rowM = page.getByTestId('variant-row').filter({ hasText: 'Talla M' });
    await rowM.getByLabel(/Precio de/).fill('27,50');
    await rowM.getByRole('button', { name: /Guardar/ }).click();
    await expect(rowM.getByRole('status')).toHaveText('Guardado.');
    const rowL = page.getByTestId('variant-row').filter({ hasText: 'Talla L' });
    await rowL.getByLabel(/Stock de/).fill('9');
    await rowL.getByRole('button', { name: /Guardar/ }).click();
    await expect(rowL.getByRole('status')).toHaveText('Guardado.');

    await page.goto(`/producto/${slug}?color=${COLOR}`);
    await expect(page.getByText('27,50 €').first()).toBeVisible();
    await expect(page.locator('[aria-disabled="true"]', { hasText: 'L' })).toHaveCount(0);

    // Baja: desactivar pide confirmación; el producto deja de verse en la tienda y se puede reactivar.
    await page.goto('/admin/productos');
    await page.getByRole('link', { name }).click();
    await page.getByRole('button', { name: 'Desactivar producto' }).click();
    await expect(page.getByText('¿Desactivar? Dejará de verse en la tienda.')).toBeVisible();
    await page.getByRole('button', { name: 'Sí, desactivar' }).click();
    await expect(page.getByRole('status')).toContainText('Producto desactivado');

    const hidden = await page.goto(`/producto/${slug}`);
    expect(hidden?.status()).toBe(404);

    await page.goto('/admin/productos?estado=inactivos');
    await expect(page.getByTestId('admin-product-row').filter({ hasText: name })).toHaveCount(1);
    await page.getByRole('link', { name }).click();
    await page.getByRole('button', { name: 'Reactivar producto' }).click();
    await expect(page.getByRole('status')).toContainText('Producto reactivado');
    const visible = await page.goto(`/producto/${slug}`);
    expect(visible?.status()).toBe(200);
  });

  test('los errores salen por campo: slug repetido, precio y stock inválidos y variante repetida', async ({ page }) => {
    const credentials = await adminUser('productos-errores');
    await login(page, credentials);

    const slug = `e2e-err-${COLOR}`;
    slugs.push(slug);
    await page.goto('/admin/productos/nuevo');
    await fillProduct(page, `Producto errores ${COLOR}`);
    await page.getByLabel('URL (slug)').fill(slug);
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page).toHaveURL(/\/admin\/productos\/[0-9a-f-]{36}$/);

    // Slug repetido en otro producto nuevo.
    await page.goto('/admin/productos/nuevo');
    await fillProduct(page, 'Otro producto');
    await page.getByLabel('URL (slug)').fill(slug);
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('Ya existe un producto con esa URL.')).toBeVisible();
    await expect(page.getByLabel('URL (slug)')).toHaveAttribute('aria-invalid', 'true');

    // Campos vacíos y altura fuera de rango.
    await page.goto('/admin/productos/nuevo');
    await page.getByLabel('Altura del modelo (cm)').fill('50');
    await page.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('La altura del modelo debe estar entre 100 y 250.')).toBeVisible();
    await expect(page.getByText('Elige un género.')).toBeVisible();

    // Variantes: precio y stock inválidos, y la misma talla y color dos veces.
    await page.goto('/admin/productos');
    await page.getByRole('link', { name: `Producto errores ${COLOR}` }).click();
    await addVariant(page, 'M', 'gratis', '-2');
    await expect(page.getByText('Escribe un importe válido, por ejemplo 29,90.')).toBeVisible();
    await expect(page.getByText('El stock debe ser un número entero, 0 o más.')).toBeVisible();
    await expect(page.getByTestId('variant-row')).toHaveCount(0);

    await addVariant(page, 'M', '10', '3');
    await expect(page.getByTestId('variant-row')).toHaveCount(1);
    await addVariant(page, 'M', '12', '4');
    await expect(page.getByText('Ya existe una variante con esa talla y ese color.')).toBeVisible();
    await expect(page.getByTestId('variant-row')).toHaveCount(1);

    // Eliminar una variante pide confirmación.
    await page.getByRole('button', { name: /^Eliminar/ }).click();
    await expect(page.getByText(/¿Eliminar la variante/)).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByTestId('variant-row')).toHaveCount(1);
    await page.getByRole('button', { name: /^Eliminar/ }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByTestId('variant-row')).toHaveCount(0);
  });

  test('el listado filtra por estado y busca por nombre', async ({ page }) => {
    const credentials = await adminUser('productos-lista');
    await login(page, credentials);
    await page.goto(`/admin/productos?q=${COLOR}`);
    await expect(page.getByTestId('admin-product-row').filter({ hasText: COLOR }).first()).toBeVisible();
    await page.goto('/admin/productos?q=zzzzzzzzzzzz');
    await expect(page.getByText('Ningún producto coincide con el filtro')).toBeVisible();
    await page.getByRole('link', { name: 'Activos', exact: true }).click();
    await expect(page).toHaveURL(/estado=activos/);
  });
});

test.describe('estilo v4: accesibilidad y responsive de productos', () => {
  test('sin violaciones graves de axe y sin desbordes a 320, 375, 768 y 1280 px', async ({ page }) => {
    const credentials = await adminUser('productos-ui');
    const created = await admin
      .from('products')
      .insert({ slug: `e2e-ui-${COLOR}`, name: `Producto ui ${COLOR}`, gender: 'mujer', category: 'blusas', occasion: 'vestir' })
      .select('id')
      .single();
    const productId = z.object({ id: z.string() }).parse(created.data).id;
    slugs.push(`e2e-ui-${COLOR}`);
    await admin.from('product_variants').insert([
      { product_id: productId, size: 'S', color: COLOR, price_cents: 3990, stock: 4 },
      { product_id: productId, size: 'M', color: COLOR, price_cents: 3990, stock: 0 },
    ]);
    await login(page, credentials);

    const urls = ['/admin/productos', '/admin/productos/nuevo', `/admin/productos/${productId}`];
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
    for (const url of [...urls, '/admin/productos?q=zzzzzzzzzz']) {
      await page.goto(url);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
        `violaciones graves en ${url}`,
      ).toEqual([]);
    }

    // Zona táctil de los controles del formulario de variantes: 44 px en móvil y 32 px en escritorio.
    for (const [width, min] of [
      [375, 43.5],
      [1280, 31.5],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/admin/productos/${productId}`);
      for (const control of [
        page.getByRole('button', { name: 'Guardar producto' }),
        page.getByRole('button', { name: 'Añadir variante' }),
        page.getByLabel(/Precio de/).first(),
        page.getByLabel(/Stock de/).first(),
      ]) {
        const box = await control.boundingBox();
        expect(box?.height ?? 0, `control a ${width}px`).toBeGreaterThanOrEqual(min);
      }
    }
  });
});
