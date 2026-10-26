import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';
import { generateCouponCode } from '../src/lib/coupons/code';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// CA-151 y CA-152 (T-120, Enmienda 49 de SPEC-001): código de descuento en el carrito lateral. Crea usuarios y cupones de prueba
// reales que se borran al terminar. El límite de 3 intentos por minuto es por cuenta, así que cada prueba usa la suya.
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);
test.use({ hasTouch: false, isMobile: false });

const admin = adminClient();
const createdEmails: string[] = [];
const couponIds: string[] = [];
const NEGRO_M = '/producto/polo-pique-basico?color=negro&talla=M';
// 1 × polo (29,90 €) + 4,95 € de envío = 34,85 €; con el 10 % (2,99 €, hacia abajo): 31,86 €.
const BASE_TOTAL = '34,85';
const COUPON_TOTAL = '31,86';

async function newUser(label: string): Promise<{ credentials: Credentials; id: string }> {
  const credentials = newCredentials(label);
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
  return { credentials, id };
}

async function newCoupon(): Promise<{ id: string; code: string }> {
  const inserted = await admin
    .from('welcome_coupons')
    .insert({ code: generateCouponCode(), email: `t120-${Math.random().toString(16).slice(2, 10)}@example.com` })
    .select('id, code')
    .single();
  if (inserted.error) throw new Error(`newCoupon: ${inserted.error.message}`);
  const coupon = z.object({ id: z.string(), code: z.string() }).parse(inserted.data);
  couponIds.push(coupon.id);
  return coupon;
}

/** Entra con la cuenta, añade el polo y deja abierto el carrito lateral con el acordeón del código desplegado. */
async function openDrawerSignedIn(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto(NEGRO_M);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await expect(page.getByTestId('drawer-line')).toHaveCount(1);
  await expect(page.getByTestId('drawer-total')).toContainText(BASE_TOTAL);
  await page.getByTestId('cart-coupon').getByText('¿Tienes un código de descuento?').click();
  await expect(page.getByTestId('cart-coupon-input')).toBeVisible();
}

async function apply(page: Page, code: string): Promise<void> {
  await page.getByTestId('cart-coupon-input').fill(code);
  await page.getByTestId('cart-coupon-apply').click();
}

test.afterAll(async () => {
  for (const email of createdEmails) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = listed.data.users.find((candidate) => candidate.email === email);
    if (user) await admin.from('orders').delete().eq('user_id', user.id);
    await deleteUserByEmail(admin, email);
  }
  if (couponIds.length > 0) await admin.from('welcome_coupons').delete().in('id', couponIds);
});

test.describe('código en el carrito lateral (CA-151)', () => {
  test('un invitado ve cómo conseguirlo y no hay campo', async ({ page }) => {
    await page.goto(NEGRO_M);
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('drawer-line')).toHaveCount(1);
    await page.getByTestId('cart-coupon').getByText('¿Tienes un código de descuento?').click();
    await expect(page.getByTestId('coupon-guest')).toContainText('Inicia sesión para usar un código de descuento.');
    await expect(page.getByTestId('cart-coupon-input')).toHaveCount(0);
  });

  test('con sesión: el descuento sale antes del total, el total baja y el pago lo trae aplicado', async ({ page }) => {
    const who = await newUser('cart-coupon-ok');
    const coupon = await newCoupon();
    await openDrawerSignedIn(page, who.credentials);
    expect(await page.getByTestId('drawer-discount').count()).toBe(0);

    await apply(page, ` ${coupon.code.toLowerCase()} `);
    await expect(page.getByTestId('cart-coupon-applied')).toContainText(coupon.code);
    await expect(page.getByTestId('drawer-discount')).toContainText('2,99');
    await expect(page.getByTestId('drawer-total')).toContainText(COUPON_TOTAL);
    // El descuento va antes del total.
    const discountY = (await page.getByTestId('drawer-discount').boundingBox())?.y ?? 0;
    const totalY = (await page.getByTestId('drawer-total').boundingBox())?.y ?? 0;
    expect(discountY).toBeLessThan(totalY);

    await page.getByTestId('drawer-checkout').click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId('coupon-applied')).toContainText(coupon.code);
    await expect(page.getByTestId('checkout-total')).toContainText(COUPON_TOTAL);
  });

  test('«Quitar código» devuelve el total y el pago ya no lo trae', async ({ page }) => {
    const who = await newUser('cart-coupon-remove');
    const coupon = await newCoupon();
    await openDrawerSignedIn(page, who.credentials);
    await apply(page, coupon.code);
    await expect(page.getByTestId('drawer-total')).toContainText(COUPON_TOTAL);
    await page.getByTestId('cart-coupon-remove').click();
    await expect(page.getByTestId('drawer-total')).toContainText(BASE_TOTAL);
    expect(await page.getByTestId('drawer-discount').count()).toBe(0);
    await page.getByTestId('drawer-checkout').click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId('checkout-total')).toContainText(BASE_TOTAL);
    expect(await page.getByTestId('coupon-applied').count()).toBe(0);
  });

  test('un código que no existe dice por qué y no cambia el total', async ({ page }) => {
    const who = await newUser('cart-coupon-bad');
    await openDrawerSignedIn(page, who.credentials);
    await apply(page, 'TRAMA-ZZZZ-ZZZZ');
    await expect(page.getByTestId('cart-coupon-error')).toContainText('Ese código no existe');
    await expect(page.getByTestId('drawer-total')).toContainText(BASE_TOTAL);
  });
});

test.describe('límite de intentos (CA-152)', () => {
  test('el 4.º intento en un minuto se rechaza sin consultar y pide esperar', async ({ page }) => {
    const who = await newUser('cart-coupon-limit');
    await openDrawerSignedIn(page, who.credentials);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await apply(page, 'TRAMA-ZZZZ-ZZZZ');
      await expect(page.getByTestId('cart-coupon-error')).toContainText('Ese código no existe');
    }
    await apply(page, 'TRAMA-ZZZZ-ZZZZ');
    await expect(page.getByTestId('cart-coupon-error')).toContainText(/Demasiados intentos\. Espera \d+ segundos?\./);
  });

  test('el campo no admite más de 20 caracteres', async ({ page }) => {
    const who = await newUser('cart-coupon-len');
    await openDrawerSignedIn(page, who.credentials);
    await page.getByTestId('cart-coupon-input').fill('A'.repeat(30));
    await expect(page.getByTestId('cart-coupon-input')).toHaveValue('A'.repeat(20));
  });
});
