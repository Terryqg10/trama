import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { adminClient } from './helpers/auth-users';

// CA-136 (T-094, Enmienda 41): al suscribirse se enseña el código de bienvenida en pantalla, con botón de copiar y el aviso de
// demostración, sin prometer ningún email. El alta real necesita newsletter_subscribers y welcome_coupons aplicadas; los emails de
// prueba se borran (suscriptor y cupón) al terminar.

const CODE = /^TRAMA-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;
const WIDTHS = [320, 375, 480, 640, 768, 1024, 1280];

const testEmails: string[] = [];
test.afterAll(async () => {
  if (testEmails.length === 0) return;
  await adminClient().from('welcome_coupons').delete().in('email', testEmails);
  await adminClient().from('newsletter_subscribers').delete().in('email', testEmails);
});

const newEmail = (): string => {
  const email = `t094-${randomUUID().slice(0, 8)}@example.com`;
  testEmails.push(email);
  return email;
};

const section = (page: Page) => page.getByTestId('newsletter');
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function openHome(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(section(page)).toBeAttached();
  await section(page).scrollIntoViewIfNeeded();
  // Espera a que el formulario esté hidratado: antes, lo escrito se perdería.
  await expect(section(page).getByRole('button', { name: 'Suscribirme' })).toBeEnabled();
}

async function subscribe(page: Page, email: string): Promise<void> {
  await section(page).getByLabel('Email', { exact: true }).fill(email);
  await section(page).getByRole('checkbox').check();
  await section(page).getByRole('button', { name: 'Suscribirme' }).click();
}

test.describe('código de bienvenida en la portada (CA-136)', () => {
  test('al suscribirse se enseña el código con la validez, el aviso de demostración y el botón de copiar', async ({ page }) => {
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
    await openHome(page);
    await subscribe(page, newEmail());

    const live = section(page).getByTestId('newsletter-message');
    await expect(live).toContainText('¡Gracias por suscribirte!');
    const coupon = live.getByTestId('welcome-coupon');
    await expect(coupon).toBeVisible();
    expect(await live.getAttribute('aria-live')).toBe('polite');
    expect(await coupon.getAttribute('role')).toBe('note');
    const code = (await coupon.getByTestId('welcome-coupon-code').textContent()) ?? '';
    expect(code).toMatch(CODE);
    await expect(coupon).toContainText(`Tu código de bienvenida: ${code}`);
    await expect(coupon).toContainText('10 % en tu primera compra');
    await expect(coupon).toContainText('válido hasta el');
    await expect(coupon).toContainText('Código de demostración: se canjea en el pago.');
    expect((await coupon.textContent())?.toLowerCase()).not.toContain('email');

    await coupon.getByRole('button', { name: 'Copiar código' }).click();
    await expect(coupon.getByTestId('demo-notice-status')).toHaveText('Copiado.');
    expect(await page.evaluate(() => window.sessionStorage.getItem('copied'))).toBe(code);
  });

  test('el mismo email recibe el mismo código al volver a suscribirse', async ({ page }) => {
    const email = newEmail();
    await openHome(page);
    await subscribe(page, email);
    const first = await section(page).getByTestId('welcome-coupon-code').textContent();
    expect(first).toMatch(CODE);

    await page.reload();
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).getByRole('button', { name: 'Suscribirme' })).toBeEnabled();
    await subscribe(page, email);
    await expect(section(page).getByTestId('welcome-coupon-code')).toHaveText(first ?? '');
  });

  test('un email caducado o ya canjeado lo dice y no enseña otro código', async ({ page }) => {
    const admin = adminClient();
    const expiredEmail = newEmail();
    const redeemedEmail = newEmail();
    await openHome(page);
    await subscribe(page, expiredEmail);
    await expect(section(page).getByTestId('welcome-coupon-code')).toBeVisible();
    await admin.from('welcome_coupons').update({ expires_at: new Date(Date.now() - 86_400_000).toISOString() }).eq('email', expiredEmail);

    await page.reload();
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).getByRole('button', { name: 'Suscribirme' })).toBeEnabled();
    await subscribe(page, expiredEmail);
    await expect(section(page).getByTestId('welcome-coupon-expired')).toHaveText('Tu código de bienvenida ha caducado.');
    await expect(section(page).getByTestId('welcome-coupon-code')).toHaveCount(0);

    await page.reload();
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).getByRole('button', { name: 'Suscribirme' })).toBeEnabled();
    await subscribe(page, redeemedEmail);
    await expect(section(page).getByTestId('welcome-coupon-code')).toBeVisible();
    await admin.from('welcome_coupons').update({ redeemed_at: new Date().toISOString() }).eq('email', redeemedEmail);
    await page.reload();
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).getByRole('button', { name: 'Suscribirme' })).toBeEnabled();
    await subscribe(page, redeemedEmail);
    await expect(section(page).getByTestId('welcome-coupon-redeemed')).toHaveText('Tu código de bienvenida ya se ha usado.');
  });

  test('sin consentimiento no hay código', async ({ page }) => {
    await openHome(page);
    await section(page).getByLabel('Email', { exact: true }).fill(newEmail());
    await section(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(section(page).getByText('Debes aceptar la política de privacidad para suscribirte.')).toBeVisible();
    await expect(section(page).getByTestId('welcome-coupon')).toHaveCount(0);
  });

  test('con el código a la vista, sin scroll horizontal ni recortes de 320 a 1280 px, y axe sin violaciones graves', async ({ page }) => {
    await openHome(page);
    await subscribe(page, newEmail());
    const coupon = section(page).getByTestId('welcome-coupon');
    await expect(coupon).toBeVisible();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await coupon.scrollIntoViewIfNeeded();
      expect(await overflow(page), `${width} px`).toBeLessThanOrEqual(1);
      const box = await coupon.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} px`).toBe(true);
    }
    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
