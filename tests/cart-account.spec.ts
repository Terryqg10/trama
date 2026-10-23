import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// SPEC-001 T-031: carrito de la cuenta y fusión al iniciar sesión (CA-04, CA-63).
// Los tests crean usuarios reales de prueba en la BD de Supabase: se ejecutan en serie.
test.describe.configure({ mode: 'serial' });
// Cada paso va a la BD en la nube y varios navegadores a la vez: se da margen frente al límite por defecto.
test.setTimeout(90_000);

const admin = adminClient();
const createdEmails: string[] = [];
const NEGRO_M = '/producto/polo-pique-basico?color=negro&talla=M';
const AZUL_S = '/producto/polo-pique-basico?color=azul&talla=S';
const STORAGE_KEY = 'trama.cart.v1';

test.afterAll(async () => {
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

async function newUser(label: string): Promise<Credentials> {
  const credentials = newCredentials(label);
  createdEmails.push(credentials.email);
  await createConfirmedUser(admin, credentials);
  return credentials;
}

async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta(\?carrito=fusionado)?$/);
}

async function add(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByText('Polo piqué básico añadido al carrito.')).toBeVisible();
}

async function guestStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

/** Pulsa y espera a que el servidor responda al guardado (las acciones de servidor son POST a la página). */
async function clickAndWaitSave(page: Page, click: () => Promise<void>): Promise<void> {
  const saved = page.waitForResponse((response) => response.request().method() === 'POST');
  await click();
  await saved;
}

function lineFor(page: Page, text: string) {
  return page.getByTestId('cart-line').filter({ hasText: text });
}

test.describe('carrito de la cuenta (CA-63, test cart-account-persist)', () => {
  test('lo que se añade con sesión se ve desde otro navegador y los cambios persisten', async ({ browser }) => {
    const credentials = await newUser('persist');
    const first = await browser.newContext();
    const second = await browser.newContext();
    try {
      const a = await first.newPage();
      const b = await second.newPage();

      await login(a, credentials);
      await add(a, NEGRO_M);
      expect(await guestStorage(a)).toBeNull();

      await login(b, credentials);
      await b.goto('/carrito');
      await expect(b.getByTestId('cart-line')).toHaveCount(1);
      await expect(b.getByTestId('cart-qty')).toHaveText('1');

      // Cambia la cantidad en el segundo navegador: el primero la ve al recargar.
      await clickAndWaitSave(b, () => b.getByRole('button', { name: /Añadir una unidad de/ }).click());
      await expect(b.getByTestId('cart-qty')).toHaveText('2');
      await b.reload();
      await expect(b.getByTestId('cart-qty')).toHaveText('2');
      await a.goto('/carrito');
      await expect(a.getByTestId('cart-qty')).toHaveText('2');
      await expect(a.getByTestId('cart-shipping')).toHaveText('Gratis');

      // El stock se respeta también en la cuenta: no pasa de 8 unidades.
      await a.goto(NEGRO_M);
      const addButton = a.getByTestId('add-to-cart');
      for (let i = 0; i < 7; i += 1) {
        await expect(addButton).toBeEnabled();
        await addButton.click();
        // Al añadir se abre el carrito lateral (T-085): se cierra con Esc para poder pulsar otra vez. Ya había 2 unidades: las 6
        // primeras pulsaciones añaden (3 a 8) y abren el carrito; la séptima ya no añade nada y no lo abre.
        if (i < 6) {
          await expect(a.getByTestId('cart-drawer')).toBeVisible();
          await a.keyboard.press('Escape');
          await expect(a.getByTestId('cart-drawer')).toBeHidden();
        }
      }
      await expect(a.getByText('Ya tienes en el carrito todas las unidades disponibles (8).')).toBeVisible();
      await a.goto('/carrito');
      await expect(a.getByTestId('cart-qty')).toHaveText('8');

      await clickAndWaitSave(a, () => a.getByRole('button', { name: /del carrito/ }).click());
      await expect(a.getByText('Tu carrito está vacío')).toBeVisible();
      await b.reload();
      await expect(b.getByText('Tu carrito está vacío')).toBeVisible();
    } finally {
      await first.close();
      await second.close();
    }
  });
});

test.describe('fusión al iniciar sesión (CA-04, test cart-merge)', () => {
  test('el carrito de invitado se suma al de la cuenta sin perder líneas y se vacía el del navegador', async ({
    browser,
  }) => {
    const credentials = await newUser('merge');

    // 1. La cuenta ya tiene el polo negro M.
    const accountContext = await browser.newContext();
    const accountPage = await accountContext.newPage();
    await login(accountPage, credentials);
    await add(accountPage, NEGRO_M);
    await accountContext.close();

    // 2. Un invitado añade el mismo polo negro M y un polo azul S, e inicia sesión.
    const guestContext = await browser.newContext();
    try {
      const guest = await guestContext.newPage();
      await add(guest, NEGRO_M);
      await add(guest, AZUL_S);
      await guest.goto('/carrito');
      await expect(guest.getByTestId('cart-line')).toHaveCount(2);

      await login(guest, credentials);
      // La fusión corre al llegar a la cuenta: el almacenamiento local queda vacío.
      await expect.poll(() => guestStorage(guest)).toBeNull();

      await guest.goto('/carrito');
      await expect(guest.getByTestId('cart-line')).toHaveCount(2);
      await expect(lineFor(guest, 'Negro').getByTestId('cart-qty')).toHaveText('2');
      await expect(lineFor(guest, 'Azul').getByTestId('cart-qty')).toHaveText('1');

      // Y persiste en la cuenta: otro navegador ve lo mismo.
      const other = await browser.newContext();
      try {
        const page = await other.newPage();
        await login(page, credentials);
        await page.goto('/carrito');
        await expect(page.getByTestId('cart-line')).toHaveCount(2);
      } finally {
        await other.close();
      }
    } finally {
      await guestContext.close();
    }
  });

  test('añadir con sesión tras entrar fusiona antes y no duplica líneas', async ({ browser }) => {
    const credentials = await newUser('merge-ficha');
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await add(page, AZUL_S);
      await login(page, credentials);
      await expect.poll(() => guestStorage(page)).toBeNull();
      await add(page, NEGRO_M);
      await page.goto('/carrito');
      await expect(page.getByTestId('cart-line')).toHaveCount(2);
      await expect(lineFor(page, 'Azul').getByTestId('cart-qty')).toHaveText('1');
    } finally {
      await context.close();
    }
  });
});
