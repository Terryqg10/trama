import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-76 y CA-77 (T-042, Enmienda 21 de SPEC-001): el corazón de favoritos en la ficha y en la barra fija. Crea usuarios
// de prueba que se borran al terminar (sus favoritos se van en cascada).
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

const admin = adminClient();
const createdEmails: string[] = [];
const FICHA = '/producto/polo-pique-basico';

test.afterAll(async () => {
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

async function newUser(label: string): Promise<Credentials> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  await createConfirmedUser(admin, credentials);
  return credentials;
}

async function login(page: Page, credentials: Credentials, expected: RegExp): Promise<void> {
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(expected);
}

async function favoriteIds(email: string): Promise<string[]> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = listed.data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error('usuario de prueba no encontrado');
  const rows = await admin.from('favorites').select('product_id').eq('user_id', user.id);
  return (rows.data ?? []).map((row: { product_id: string }) => row.product_id);
}

test.describe('CA-76: sin sesión el corazón lleva a iniciar sesión y vuelve a la ficha', () => {
  test('tras entrar, el producto queda en favoritos y el parámetro se limpia', async ({ page }) => {
    const credentials = await newUser('fav-login');
    await page.goto(FICHA);
    const heart = page.getByTestId('favorite-button');
    await expect(heart).toHaveAttribute('href', /\/acceso\?siguiente=/);
    await heart.click();
    await expect(page).toHaveURL(/\/acceso\?siguiente=/);
    await login(page, credentials, new RegExp(`${FICHA}$`));
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('favorite-button')).toHaveAccessibleName('Quitar de favoritos');
    expect(await favoriteIds(credentials.email)).toHaveLength(1);
  });

  test('un siguiente que no es la ficha con favorito=1 se ignora (sin redirección abierta)', async ({ page }) => {
    const credentials = await newUser('fav-open');
    await page.goto('/acceso?siguiente=https://evil.example');
    await login(page, credentials, /\/cuenta$/);
  });
});

test.describe('CA-77: con sesión el corazón añade, quita y se conserva al recargar', () => {
  test('alterna, informa del estado por nombre y aria-pressed, y persiste', async ({ page }) => {
    const credentials = await newUser('fav-toggle');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.goto(FICHA);
    const heart = page.getByTestId('favorite-button');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await expect(heart).toHaveAccessibleName('Añadir a favoritos');
    const box = await heart.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);

    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toHaveAccessibleName('Quitar de favoritos');
    await expect(page.getByTestId('favorite-status').filter({ hasText: 'añadido a favoritos' })).toBeAttached();
    await expect.poll(async () => (await favoriteIds(credentials.email)).length).toBe(1);

    await page.reload();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('favorite-button').click();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await favoriteIds(credentials.email)).length).toBe(0);
    await page.reload();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('el corazón de la barra fija (móvil) está sincronizado con el de la ficha', async ({ page }) => {
    const credentials = await newUser('fav-sticky');
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.goto(FICHA);
    await page.getByTestId('add-to-cart').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 900);
    const sticky = page.getByTestId('favorite-button-sticky');
    await expect(sticky).toBeVisible();
    await sticky.click();
    await expect(sticky).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal ni nombre cortado en la barra a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(FICHA);
      await page.mouse.wheel(0, 900);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      if (width < 768) {
        const sticky = page.getByTestId('favorite-button-sticky');
        const box = await sticky.boundingBox();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      }
    });
  }
});

// CA-78 (T-043): «Mis favoritos» en la cuenta.
test.describe('CA-78: página «Mis favoritos»', () => {
  test('sin sesión redirige al acceso', async ({ page }) => {
    await page.goto('/cuenta/favoritos');
    await expect(page).toHaveURL(/\/acceso/);
  });

  test('sin favoritos muestra el aviso con enlace al catálogo', async ({ page }) => {
    const credentials = await newUser('fav-empty');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.getByRole('link', { name: /Mis favoritos/ }).click();
    await expect(page).toHaveURL(/\/cuenta\/favoritos$/);
    await expect(page.getByText('Aún no tienes favoritos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver novedades' })).toHaveAttribute('href', '/novedades');
  });

  test('con favoritos los lista con enlace a la ficha y permite quitarlos', async ({ page }) => {
    const credentials = await newUser('fav-list');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.goto(FICHA);
    await page.getByTestId('favorite-button').click();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await favoriteIds(credentials.email)).length).toBe(1);

    await page.goto('/cuenta/favoritos');
    const list = page.getByTestId('favorites-list');
    await expect(list.locator('article')).toHaveCount(1);
    await expect(list.getByRole('link', { name: 'Polo piqué básico' })).toHaveAttribute('href', FICHA);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await list.getByRole('button', { name: 'Quitar Polo piqué básico de favoritos' }).click();
    await expect(page.getByText('Aún no tienes favoritos')).toBeVisible();
    expect(await favoriteIds(credentials.email)).toHaveLength(0);
  });

  test('un producto desactivado no aparece', async ({ page }) => {
    const credentials = await newUser('fav-inactive');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);
    await page.goto(FICHA);
    await page.getByTestId('favorite-button').click();
    await expect.poll(async () => (await favoriteIds(credentials.email)).length).toBe(1);
    // Se desactiva un producto de PRUEBA propio, no uno del catálogo real.
    const created = await admin
      .from('products')
      .insert({ slug: `t043-${Date.now()}`, name: 'Prenda inactiva T-043', gender: 'mujer', category: 'jerseis', occasion: 'casual', active: false })
      .select('id')
      .single();
    if (created.error) throw new Error(created.error.message);
    const productId = (created.data as { id: string }).id;
    const user = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find((u) => u.email === credentials.email);
    await admin.from('favorites').insert({ user_id: user?.id ?? '', product_id: productId });
    await page.goto('/cuenta/favoritos');
    await expect(page.getByTestId('favorites-list').locator('article')).toHaveCount(1);
    await expect(page.getByText('Prenda inactiva T-043')).toHaveCount(0);
    await admin.from('products').delete().eq('id', productId);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`sin scroll horizontal a ${width} px`, async ({ page }) => {
      const credentials = await newUser(`fav-w${width}`);
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/acceso');
      await login(page, credentials, /\/cuenta$/);
      await page.goto('/cuenta/favoritos');
      await expect(page.getByText('Aún no tienes favoritos')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
