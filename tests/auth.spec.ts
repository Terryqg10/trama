import { expect, test, type Page } from '@playwright/test';
import {
  adminClient,
  createConfirmedUser,
  deleteUserByEmail,
  newCredentials,
  type Credentials,
} from './helpers/auth-users';

// Los tests comparten la BD en la nube y crean usuarios reales: se ejecutan en serie.
test.describe.configure({ mode: 'serial' });

const admin = adminClient();
const createdEmails: string[] = [];

test.afterAll(async () => {
  for (const email of createdEmails) await deleteUserByEmail(admin, email);
});

async function login(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/acceso');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test.describe('cuenta: registro e inicio de sesión (CA-06, CA-07)', () => {
  // Requiere que el proyecto de Supabase de desarrollo tenga «Confirm email» desactivado: con la
  // confirmación activa el alta envía un correo y el correo integrado tiene un límite muy bajo.
  test('auth-register-login: se registra por el formulario y puede iniciar sesión', async ({ page }) => {
    const credentials = newCredentials('alta');
    createdEmails.push(credentials.email);

    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Cliente de prueba');
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Cliente de prueba');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await login(page, credentials);
    await expect(page).toHaveURL(/\/cuenta$/);
  });

  // Variante sin depender del correo: la cuenta se crea con la API de administración.
  test('una cuenta creada puede iniciar y cerrar sesión', async ({ page }) => {
    const credentials = newCredentials('registro');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);

    await login(page, credentials);
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeVisible();
    await expect(page.getByText(credentials.email)).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/cuenta');
    await expect(page).toHaveURL(/\/acceso$/);

    await login(page, credentials);
    await expect(page).toHaveURL(/\/cuenta$/);
  });

  test('registro: los errores de validación salen por campo sin enviar ningún correo', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Cliente de prueba');
    await page.getByLabel('Email').fill('no-es-un-email');
    await page.getByLabel('Contraseña').fill('corta');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Introduce un email válido.')).toBeVisible();
    await expect(page.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/registro$/);
  });

  // CA-154 (T-122, invariante I10): una contraseña larga pero sin números se rechaza en el servidor y no se crea la cuenta.
  test('registro: una contraseña débil se rechaza con el mensaje del OS y no crea la cuenta', async ({ page }) => {
    const email = newCredentials('debil').email;
    createdEmails.push(email);
    await page.goto('/registro');
    await page.getByLabel('Nombre').fill('Cliente de prueba');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill('solo-letras-largas');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('Contraseña débil: usa al menos 8 caracteres con letras y números.')).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    expect(listed.data.users.some((user) => user.email === email)).toBe(false);
  });

  test('auth-bad-credentials: el error es genérico y no revela si el email existe', async ({ page }) => {
    const existing = newCredentials('existente');
    createdEmails.push(existing.email);
    await createConfirmedUser(admin, existing);

    // Email que existe con contraseña errónea.
    await login(page, { email: existing.email, password: 'contraseña-incorrecta' });
    const alert = page.locator('main').getByRole('alert');
    await expect(alert).toBeVisible();
    const messageExisting = await alert.innerText();

    // Email que no existe.
    await login(page, newCredentials('inexistente'));
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    const messageMissing = await page.locator('main').getByRole('alert').innerText();

    expect(messageExisting).toBe('El email o la contraseña no son correctos.');
    expect(messageMissing).toBe(messageExisting);
    await expect(page).toHaveURL(/\/acceso$/);
  });

  test('una página de cuenta sin sesión lleva al acceso', async ({ page }) => {
    await page.goto('/cuenta');
    await expect(page).toHaveURL(/\/acceso$/);
  });
});

test.describe('cuenta: recuperación de contraseña (CA-59, solicitud)', () => {
  test('auth-recovery-request: mismo mensaje exista o no el email', async ({ page }) => {
    const existing = newCredentials('recuperar');
    createdEmails.push(existing.email);
    await createConfirmedUser(admin, existing);

    const messages: string[] = [];
    for (const email of [existing.email, newCredentials('sin-cuenta').email]) {
      await page.goto('/recuperar');
      await page.getByLabel('Email').fill(email);
      await page.getByRole('button', { name: 'Enviar enlace' }).click();
      const status = page.locator('main').getByRole('status');
      await expect(status).toBeVisible();
      messages.push(await status.innerText());
    }
    expect(messages[1]).toBe(messages[0]);
    expect(messages[0]).toContain('Si existe una cuenta');
  });

  test('un enlace de recuperación inválido muestra el aviso y no abre la pantalla de nueva contraseña', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=invalido&type=recovery&next=/recuperar/nueva');
    await expect(page).toHaveURL(/\/recuperar\?error=enlace$/);
    await expect(page.locator('main').getByRole('alert')).toContainText('El enlace no es válido o ha caducado');

    await page.goto('/recuperar/nueva');
    await expect(page).toHaveURL(/\/recuperar\?error=enlace$/);
  });
});

test.describe('cuenta: perfil y direcciones (CA-08, interfaz)', () => {
  test('alta con errores por campo, alta correcta, edición y borrado', async ({ page }) => {
    const credentials = newCredentials('direcciones');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);
    await login(page, credentials);
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByText('Sin direcciones guardadas.')).toBeVisible();

    await page.getByRole('link', { name: 'Añadir dirección' }).click();
    await page.getByLabel('Nombre y apellidos del destinatario').fill('Ana Pérez');
    await page.getByLabel('Dirección', { exact: true }).fill('Calle Mayor 1');
    await page.getByLabel('Código postal').fill('2800');
    await page.getByLabel('Población').fill('Madrid');
    await page.getByLabel('Provincia').fill('Madrid');
    await page.getByRole('button', { name: 'Guardar dirección' }).click();
    await expect(page.getByText('El código postal debe tener 5 dígitos.')).toBeVisible();
    await expect(page.getByLabel('Código postal')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/cuenta\/direcciones\/nueva$/);

    await page.getByLabel('Código postal').fill('28001');
    await page.getByRole('button', { name: 'Guardar dirección' }).click();
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.getByText('Calle Mayor 1')).toBeVisible();

    await page.getByRole('link', { name: /Editar la dirección de Ana Pérez/ }).click();
    await page.getByLabel('Población').fill('Getafe');
    await page.getByRole('button', { name: 'Guardar dirección' }).click();
    await expect(page.getByText('28001 Getafe, Madrid')).toBeVisible();

    await page.getByRole('button', { name: /Eliminar la dirección de Ana Pérez/ }).click();
    await expect(page.getByText('Sin direcciones guardadas.')).toBeVisible();
  });

  test('el nombre del perfil se puede editar y no admite vacío', async ({ page }) => {
    const credentials = newCredentials('perfil');
    createdEmails.push(credentials.email);
    await createConfirmedUser(admin, credentials);
    await login(page, credentials);

    await page.getByLabel('Nombre', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.getByText('Este campo es obligatorio.')).toBeVisible();

    await page.getByLabel('Nombre', { exact: true }).fill('Nombre nuevo');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.locator('main').getByRole('status')).toHaveText('Nombre actualizado.');
    await page.reload();
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nombre nuevo');
  });
});
