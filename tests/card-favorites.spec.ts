import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-147 (T-115, Enmienda 47 de SPEC-001): corazón de favoritos en la tarjeta de los listados. Crea usuarios de prueba
// que se borran al terminar (sus favoritos se van en cascada).
test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

const admin = adminClient();
const createdEmails: string[] = [];

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

test.describe('CA-147: sin sesión', () => {
  test('el corazón lleva al acceso y, tras entrar, vuelve al listado con sus filtros', async ({ page }) => {
    const credentials = await newUser('card-fav-guest');
    await page.goto('/hombre?categoria=polos');
    const heart = page.getByTestId('card-favorite').first();
    await expect(heart).toHaveAttribute('href', /\/acceso\?siguiente=/);
    await heart.click();
    await expect(page).toHaveURL(/\/acceso\?siguiente=/);
    await login(page, credentials, /\/hombre\?categoria=polos$/);
  });
});

test.describe('CA-147: con sesión', () => {
  test('alterna sin abrir la ficha, aparece en /cuenta/favoritos y sale marcado al recargar', async ({ page }) => {
    const credentials = await newUser('card-fav-user');
    await page.goto('/acceso');
    await login(page, credentials, /\/cuenta$/);

    await page.goto('/hombre');
    const card = page.locator('article').first();
    const name = await card.locator('h2').innerText();
    const heart = card.getByTestId('card-favorite');
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await expect(heart).toHaveAccessibleName(`Añadir ${name} a favoritos`);
    const box = await heart.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await heart.click();
    await expect(page).toHaveURL(/\/hombre$/);
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toHaveAccessibleName(`Quitar ${name} de favoritos`);

    await page.reload();
    await expect(page.locator('article').first().getByTestId('card-favorite')).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/cuenta/favoritos');
    await expect(page.locator('article h2', { hasText: name })).toBeVisible();

    await page.goto('/hombre');
    const again = page.locator('article').first().getByTestId('card-favorite');
    await again.click();
    await expect(again).toHaveAttribute('aria-pressed', 'false');
  });

  test('el corazón no se sale de la foto ni provoca desbordes de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/hombre');
      const card = page.locator('article').first();
      const cardBox = await card.boundingBox();
      const heartBox = await card.getByTestId('card-favorite').boundingBox();
      if (!cardBox || !heartBox) throw new Error('sin medidas');
      expect(heartBox.x + heartBox.width, `a ${width}px`).toBeLessThanOrEqual(cardBox.x + cardBox.width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});
