import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { adminClient } from './helpers/auth-users';

// CA-100 y CA-101 (T-059 y T-060): sección de newsletter de la portada (propuestas de valor y suscripción). El alta
// real necesita la migración de newsletter_subscribers (T-058) aplicada en Supabase; los emails de prueba se borran.

const newsletter = (page: Page) => page.getByTestId('newsletter');
const message = (page: Page) => page.getByTestId('newsletter-message');

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(newsletter(page)).toBeAttached();
  await newsletter(page).scrollIntoViewIfNeeded();
}

const testEmails: string[] = [];
const newEmail = (): string => {
  const email = `t060-${randomUUID().slice(0, 8)}@example.com`;
  testEmails.push(email);
  return email;
};

test.afterAll(async () => {
  if (testEmails.length > 0) {
    // Suscribirse también crea el cupón de bienvenida del email (T-093): se borra con él.
    await adminClient().from('welcome_coupons').delete().in('email', testEmails);
    await adminClient().from('newsletter_subscribers').delete().in('email', testEmails);
  }
});

test.describe('sin propuestas de valor sobre el newsletter (CA-101, CA-111)', () => {
  test('las tres propuestas de valor ya no están: pasaron a la sección de confianza', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('value-props')).toHaveCount(0);
    await expect(page.getByText('MODA URBANA')).toHaveCount(0);
    await expect(page.getByText('ENVÍOS GRATIS')).toHaveCount(0);
  });

  test('sin scroll horizontal de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await open(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('formulario de newsletter (CA-101)', () => {
  test('tiene título, email, casilla sin marcar con enlace a /privacidad y «Suscribirme», sobre bg-surface-muted', async ({ page }) => {
    await open(page);
    const section = newsletter(page);
    await expect(section.getByRole('heading', { level: 2, name: '¡Entérate de todas las novedades y ofertas!' })).toBeVisible();
    await expect(section.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(section.getByRole('checkbox')).not.toBeChecked();
    await expect(section.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad');
    await expect(section.getByRole('button', { name: 'Suscribirme' })).toBeVisible();
    expect(await section.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
    const bg = await section.evaluate((el) => getComputedStyle(el).backgroundColor);
    const mutedBg = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'bg-surface-muted';
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    expect(bg).toBe(mutedBg);
  });

  test('el enlace de privacidad lleva a la página de privacidad', async ({ page }) => {
    await open(page);
    await newsletter(page).getByRole('link', { name: 'política de privacidad' }).click();
    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('la región de mensajes es aria-live="polite" y existe antes de enviar', async ({ page }) => {
    await open(page);
    await expect(message(page)).toHaveAttribute('aria-live', 'polite');
    await expect(message(page)).toBeEmpty();
  });

  test('vacío: pide el email y el consentimiento, y el foco va al primer campo con error', async ({ page }) => {
    await open(page);
    await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(newsletter(page).getByText('Este campo es obligatorio.')).toBeVisible();
    await expect(newsletter(page).getByText('Debes aceptar la política de privacidad para suscribirte.')).toBeVisible();
    await expect(message(page).getByRole('alert')).toContainText('Revisa los datos');
    await expect(newsletter(page).getByRole('textbox', { name: 'Email' })).toBeFocused();
  });

  test('un email mal formado se rechaza y se conserva lo escrito', async ({ page }) => {
    await open(page);
    await newsletter(page).getByRole('textbox', { name: 'Email' }).fill('no-es-un-email');
    await newsletter(page).getByRole('checkbox').check();
    await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(newsletter(page).getByText('Introduce un email válido.')).toBeVisible();
    await expect(newsletter(page).getByRole('textbox', { name: 'Email' })).toHaveValue('no-es-un-email');
  });

  test('sin marcar el consentimiento no se suscribe aunque el email sea válido', async ({ page }) => {
    await open(page);
    await newsletter(page).getByRole('textbox', { name: 'Email' }).fill(newEmail());
    await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(newsletter(page).getByText('Debes aceptar la política de privacidad para suscribirte.')).toBeVisible();
    await expect(message(page).getByRole('status')).toHaveCount(0);
  });

  test('con email y consentimiento se suscribe y se anuncia el éxito; repetir el email responde igual', async ({ page }) => {
    await open(page);
    const email = newEmail();
    await newsletter(page).getByRole('textbox', { name: 'Email' }).fill(email);
    await newsletter(page).getByRole('checkbox').check();
    await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(message(page).getByRole('status')).toContainText('¡Gracias por suscribirte!');

    const stored = await adminClient().from('newsletter_subscribers').select('email, consent').eq('email', email);
    expect(stored.data).toEqual([{ email, consent: true }]);

    // El mismo email otra vez: mismo mensaje y una sola fila (no revela quién estaba suscrito).
    await newsletter(page).getByRole('textbox', { name: 'Email' }).fill(email.toUpperCase());
    await newsletter(page).getByRole('checkbox').check();
    await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
    await expect(message(page).getByRole('status')).toContainText('¡Gracias por suscribirte!');
    const again = await adminClient().from('newsletter_subscribers').select('email').eq('email', email);
    expect(again.data).toHaveLength(1);
  });

  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('el formulario se envía y muestra los errores del servidor', async ({ page }) => {
      await open(page);
      await newsletter(page).getByRole('button', { name: 'Suscribirme' }).click();
      await expect(newsletter(page).getByText('Debes aceptar la política de privacidad para suscribirte.')).toBeVisible();
    });
  });
});
