import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ACTION_NAV, LEGAL_NAV, MAIN_NAV } from '../src/lib/domain/navigation';
import { adminClient, createConfirmedUser, deleteUserByEmail, newCredentials } from './helpers/auth-users';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const ROUTES = [
  '/',
  ...MAIN_NAV.map((item) => item.href),
  ACTION_NAV.cart.href,
  ACTION_NAV.account.href,
  ...LEGAL_NAV.map((item) => item.href),
  '/acceso',
  '/registro',
  '/recuperar',
  '/recuperar?error=enlace',
];

test.describe('accesibilidad', () => {
  for (const route of ROUTES) {
    test(`${route} no tiene violaciones graves ni críticas`, async ({ page }) => {
      await page.goto(route);
      // Los listados del catálogo se cargan en streaming: se espera al contenido real.
      await expect(page.getByRole('status')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (serious.length > 0) {
        for (const v of serious) {
          console.error(`[a11y] ${v.id} (${v.impact}): ${v.help}`);
          for (const node of v.nodes.slice(0, 3)) {
            console.error(`  - ${node.target.join(' ')}`);
          }
        }
      }
      expect(serious, 'violaciones graves o críticas de axe').toEqual([]);
    });
  }

  const CATALOG_STATES: ReadonlyArray<readonly [string, string]> = [
    ['listado de mujer con filtros', '/mujer?categoria=blusas&ocasion=vestir'],
    ['estado vacío del listado', '/mujer?categoria=pantalones&color=burdeos'],
    ['filtros inválidos ignorados', '/hombre?genero=niño&min=-5'],
    ['novedades con género', '/novedades?genero=mujer'],
    ['ficha de producto', '/producto/polo-pique-basico'],
    ['ficha con color y talla elegidos', '/producto/polo-pique-basico?color=negro&talla=M'],
    ['ficha con una talla agotada', '/producto/polo-pique-basico?color=negro'],
    ['404 de la ficha', '/producto/no-existe-este-producto'],
  ];

  for (const [label, url] of CATALOG_STATES) {
    test(`${label} no tiene violaciones graves`, async ({ page }) => {
      await page.goto(url);
      // Se analiza el contenido real, no el esqueleto de carga.
      await expect(page.getByRole('status')).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(serious, `violaciones graves en ${url}`).toEqual([]);
    });
  }

  test('el panel de filtros (drawer en móvil) abierto no tiene violaciones graves', async ({ page }) => {
    await page.goto('/mujer');
    await expect(page.getByRole('status')).toHaveCount(0);
    const open = page.locator('[data-testid="filters-open"]');
    if (await open.isVisible()) await open.click();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, 'violaciones graves con el panel abierto').toEqual([]);
  });

  test('la guía de tallas abierta no tiene violaciones graves', async ({ page }) => {
    await page.goto('/producto/camisa-oxford-algodon');
    await page.locator('[data-testid="size-guide-open"]').click();
    await expect(page.locator('[data-testid="size-guide-modal"]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, 'violaciones graves con la guía abierta').toEqual([]);
  });

  test('el menú móvil abierto no tiene violaciones graves', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.getByRole('link', { name: 'Abrir menú' }).click();
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, 'violaciones graves o críticas de axe').toEqual([]);
  });

  test('la cuenta con sesión, el formulario de dirección y sus errores no tienen violaciones graves', async ({ page }) => {
    const admin = adminClient();
    const credentials = newCredentials('a11y');
    await createConfirmedUser(admin, credentials);
    try {
      await page.goto('/acceso');
      await page.getByLabel('Email').fill(credentials.email);
      await page.getByLabel('Contraseña').fill(credentials.password);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page).toHaveURL(/\/cuenta$/);

      const pages: ReadonlyArray<readonly [string, () => Promise<void>]> = [
        ['cuenta sin direcciones', async () => {}],
        ['formulario de dirección', async () => {
          await page.getByRole('link', { name: 'Añadir dirección' }).click();
          await expect(page.getByRole('heading', { level: 1, name: 'Nueva dirección' })).toBeVisible();
        }],
        ['formulario de dirección con errores', async () => {
          await page.getByRole('button', { name: 'Guardar dirección' }).click();
          await expect(page.getByLabel('Código postal')).toHaveAttribute('aria-invalid', 'true');
        }],
      ];
      for (const [label, step] of pages) {
        await step();
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const serious = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(serious, `violaciones graves en: ${label}`).toEqual([]);
      }
    } finally {
      await deleteUserByEmail(admin, credentials.email);
    }
  });

  test('el carrito con una línea y la ficha con talla elegida no tienen violaciones graves', async ({ page }) => {
    await page.goto('/producto/polo-pique-basico?color=negro&talla=M');
    await expect(page.getByTestId('add-to-cart')).toBeEnabled();
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByText('Polo piqué básico añadido al carrito.')).toBeVisible();

    const ficha = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      ficha.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      'violaciones graves en la ficha',
    ).toEqual([]);

    await page.goto('/carrito');
    await expect(page.getByTestId('cart-line')).toHaveCount(1);
    const cart = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(
      cart.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      'violaciones graves en el carrito',
    ).toEqual([]);
  });

  test('el checkout (con dirección, con avisos y sin dirección) y la página de gracias no tienen violaciones graves', async ({ page }) => {
    const admin = adminClient();
    const credentials = newCredentials('a11y-checkout');
    const userId = await createConfirmedUser(admin, credentials);
    try {
      await admin.from('addresses').insert({
        user_id: userId,
        recipient_name: 'Ana Pérez',
        line1: 'Calle Mayor 1',
        postal_code: '28001',
        city: 'Madrid',
        province: 'Madrid',
      });
      await page.goto('/acceso');
      await page.getByLabel('Email').fill(credentials.email);
      await page.getByLabel('Contraseña').fill(credentials.password);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page).toHaveURL(/\/cuenta$/);

      await page.goto('/producto/polo-pique-basico?color=negro&talla=M');
      await expect(page.getByTestId('add-to-cart')).toBeEnabled();
      await page.getByTestId('add-to-cart').click();
      await expect(page.getByText('Polo piqué básico añadido al carrito.')).toBeVisible();

      const scan = async (label: string) => {
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(
          results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
          `violaciones graves en: ${label}`,
        ).toEqual([]);
      };

      await page.goto('/checkout');
      await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeVisible();
      await scan('checkout con dirección');

      // Con un aviso de stock (cantidad por encima de lo disponible).
      const cart = await admin.from('carts').select('id').eq('user_id', userId).single();
      await admin.from('cart_items').update({ qty: 50 }).eq('cart_id', String((cart.data as { id: string }).id));
      await page.goto('/checkout');
      await expect(page.locator('main').getByRole('alert')).toBeVisible();
      await scan('checkout con avisos');

      await admin.from('addresses').delete().eq('user_id', userId);
      await page.goto('/checkout');
      await expect(page.getByText('Necesitas una dirección de envío')).toBeVisible();
      await scan('checkout sin dirección');

      const order = await admin
        .from('orders')
        .insert({ user_id: userId, total_cents: 3485, shipping_cents: 495, shipping_address: { country: 'ES' } })
        .select('id')
        .single();
      await page.goto(`/pedido/${String((order.data as { id: string }).id)}/gracias`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await scan('página de gracias');
    } finally {
      await admin.from('orders').delete().eq('user_id', userId);
      await deleteUserByEmail(admin, credentials.email);
    }
  });

  test('respeta prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const hasInfiniteAnim = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const style = getComputedStyle(el);
        if (style.animationIterationCount === 'infinite') return true;
      }
      return false;
    });
    expect(hasInfiniteAnim).toBe(false);
    await context.close();
  });
});
