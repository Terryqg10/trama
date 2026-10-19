import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// CA-72 (T-039): barra fija «Añadir al carrito» en la ficha, solo en móvil. Datos del seed `catalog-demo.sql`:
// «polo-pique-basico» (negro, talla M, con stock).

const FICHA = '/producto/polo-pique-basico?color=negro&talla=M';
const STORAGE_KEY = 'trama.cart.v1';

async function open(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(FICHA);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
}

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

/** Deja el botón original en mitad de la pantalla: la barra debe estar oculta. */
async function showOriginalButton(page: Page): Promise<void> {
  await page.getByTestId('add-to-cart').evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

async function savedCart(page: Page): Promise<Array<{ variantId: string; qty: number }>> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
}

test.describe('barra fija de la ficha en móvil (CA-72)', () => {
  test('oculta con el botón original a la vista, visible al bajar, añade igual que el original y se oculta al volver', async ({ page }) => {
    await open(page, 375);
    const bar = page.getByTestId('sticky-add-to-cart');
    await showOriginalButton(page);
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    await expect(bar).not.toBeInViewport();

    await scrollToBottom(page);
    await expect(bar).toHaveAttribute('aria-hidden', 'false');
    await expect(bar).toBeInViewport();
    await expect(bar).toContainText('Polo piqué básico');
    await expect(bar).toContainText('29,90');

    await page.getByTestId('add-to-cart-sticky').click();
    await expect(bar.getByText('Polo piqué básico añadido al carrito.')).toBeVisible();
    const cart = await savedCart(page);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.qty).toBe(1);

    await showOriginalButton(page);
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    await expect(bar).not.toBeInViewport();
  });

  test('oculta, la barra no recibe foco con el teclado', async ({ page }) => {
    await open(page, 375);
    await showOriginalButton(page);
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'true');
    const inert = await page.getByTestId('sticky-add-to-cart').evaluate((el) => el.hasAttribute('inert'));
    expect(inert).toBe(true);
    await scrollToBottom(page);
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'false');
    const inertWhenVisible = await page.getByTestId('sticky-add-to-cart').evaluate((el) => el.hasAttribute('inert'));
    expect(inertWhenVisible).toBe(false);
  });

  test('sin talla elegida el botón de la barra está deshabilitado y el aviso «Elige una talla» no se repite', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/producto/polo-pique-basico');
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('add-to-cart-sticky')).toBeDisabled();
    await expect(page.getByText('Elige una talla para añadirla al carrito.')).toHaveCount(1);
  });

  for (const width of [768, 1280]) {
    test(`a ${width} px la barra no existe en pantalla, ni al bajar`, async ({ page }) => {
      await open(page, width);
      await scrollToBottom(page);
      await expect(page.getByTestId('sticky-add-to-cart')).toBeHidden();
    });
  }

  test('con prefers-reduced-motion la barra aparece sin transición', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 375);
    const duration = await page
      .getByTestId('sticky-add-to-cart')
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
    await scrollToBottom(page);
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'false');
  });

  test('sin movimiento reducido la transición dura 300 ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, 375);
    const duration = await page
      .getByTestId('sticky-add-to-cart')
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toContain('0.3s');
  });

  test('al final de la página la barra no tapa el contenido', async ({ page }) => {
    await open(page, 375);
    await scrollToBottom(page);
    const bar = page.getByTestId('sticky-add-to-cart');
    await expect(bar).toBeInViewport();
    const barTop = (await bar.boundingBox())?.y ?? 0;
    const lastLink = page.locator('footer a').last();
    const lastBottom = await lastLink.evaluate((el) => el.getBoundingClientRect().bottom);
    expect(lastBottom).toBeLessThanOrEqual(barTop + 1);
  });

  test('con la barra visible (320 y 375 px) y sin ella (768 px) no hay violaciones graves de axe ni scroll horizontal', async ({ page }) => {
    for (const width of [320, 375, 768]) {
      await open(page, width);
      await scrollToBottom(page);
      if (width < 768) {
        // Espera al final del fundido: axe medido a mitad de la transición ve un contraste falso.
        await expect(page.getByTestId('sticky-add-to-cart')).toHaveAttribute('aria-hidden', 'false');
        await expect(page.getByTestId('sticky-add-to-cart')).toHaveCSS('opacity', '1');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
        `violaciones graves a ${width}px`,
      ).toEqual([]);
    }
  });
});
