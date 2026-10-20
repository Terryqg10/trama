import { expect, test, type Page } from '@playwright/test';

// CA-110 (T-066): los dos mensajes de la barra de anuncios se turnan cada 4 s con transición (el actual sube y se
// desvanece, el siguiente entra desde abajo), se pausan con ratón, foco o botón, y con prefers-reduced-motion se ven
// los dos sin movimiento. Se prueba con tiempo real: `motion` no completa las transiciones con el reloj simulado.

const COLLECTION = 'Nueva colección Otoño/Invierno ya disponible';
const SHIPPING = 'Envío gratis a partir de 50,00 €';

const bar = (page: Page) => page.getByTestId('top-bar');
const message = (page: Page) => page.getByTestId('top-bar-message');
const index = (page: Page) => bar(page).getAttribute('data-message-index');

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/');
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toHaveAttribute('data-playing', 'true');
}

test.describe('barra de anuncios rotativa (CA-110)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('empieza con la colección, pasa al envío gratis a los ~4 s y vuelve al primero', async ({ page }) => {
    await open(page);
    await expect(message(page)).toHaveText(COLLECTION);
    await expect(message(page)).toHaveText(SHIPPING, { timeout: 9000 });
    await expect(message(page)).toHaveText(COLLECTION, { timeout: 9000 });
  });

  test('la transición sube y desvanece el que sale y hace entrar el siguiente desde abajo', async ({ page }) => {
    await open(page);
    // Se muestrea la posición y la opacidad del mensaje durante un cambio entero.
    const samples = await page.evaluate(
      () =>
        new Promise<Array<{ y: number; opacity: number }>>((resolve) => {
          const result: Array<{ y: number; opacity: number }> = [];
          const timer = window.setInterval(() => {
            const el = document.querySelector('[data-testid="top-bar-message"]');
            if (el) {
              const css = getComputedStyle(el);
              const matrix = new DOMMatrixReadOnly(css.transform === 'none' ? undefined : css.transform);
              result.push({ y: matrix.m42, opacity: Number(css.opacity) });
            }
          }, 30);
          window.setTimeout(() => {
            window.clearInterval(timer);
            resolve(result);
          }, 6500);
        }),
    );
    expect(samples.some((s) => s.y < -2 && s.opacity < 1)).toBe(true); // sale hacia arriba y se desvanece
    expect(samples.some((s) => s.y > 2 && s.opacity < 1)).toBe(true); // entra desde abajo
    expect(samples.at(-1)?.opacity).toBe(1);
  });

  test('el botón de pausa detiene los mensajes y el de reanudar los retoma', async ({ page }) => {
    await open(page);
    await bar(page).getByRole('button', { name: 'Pausar los mensajes de la barra' }).click();
    await page.mouse.move(5, 500);
    await expect(bar(page)).toHaveAttribute('data-playing', 'false');
    const before = await index(page);
    await page.waitForTimeout(5500);
    expect(await index(page)).toBe(before);
    await bar(page).getByRole('button', { name: 'Reanudar los mensajes de la barra' }).click();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.mouse.move(5, 500);
    await expect(bar(page)).toHaveAttribute('data-playing', 'true');
    await expect.poll(() => index(page), { timeout: 9000 }).not.toBe(before);
  });

  test('se detiene con el ratón encima y sigue al sacarlo', async ({ page }) => {
    await open(page);
    await bar(page).hover();
    await expect(bar(page)).toHaveAttribute('data-playing', 'false');
    const before = await index(page);
    await page.waitForTimeout(5500);
    expect(await index(page)).toBe(before);
    await page.mouse.move(5, 500);
    await expect(bar(page)).toHaveAttribute('data-playing', 'true');
  });

  test('se detiene con el foco dentro de la barra', async ({ page }) => {
    await open(page);
    await bar(page).getByRole('button').focus();
    await expect(bar(page)).toHaveAttribute('data-playing', 'false');
    await page.mouse.move(5, 500);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await expect(bar(page)).toHaveAttribute('data-playing', 'true');
  });

  test('el botón de pausa mide al menos 44 × 44 px y la barra 44 px de alto', async ({ page }) => {
    await open(page);
    const button = await bar(page).getByRole('button').boundingBox();
    expect(button?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(button?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect((await bar(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('los lectores de pantalla tienen siempre los dos textos y el rótulo animado va oculto para ellos', async ({ page }) => {
    await open(page);
    await expect(bar(page)).toContainText(COLLECTION);
    await expect(bar(page)).toContainText(SHIPPING);
    expect(await message(page).evaluate((el) => el.closest('[aria-hidden="true"]') !== null)).toBe(true);
  });

  test('la barra no se sale de la ventana ni crea scroll horizontal de 320 a 1280 px', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await open(page, width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
      const box = await message(page).boundingBox();
      expect((box?.x ?? -1) + (box?.width ?? 0), `ancho a ${width}px`).toBeLessThanOrEqual(width + 0.5);
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(-0.5);
    }
  });
});

test.describe('con prefers-reduced-motion (CA-110)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('se ven los dos mensajes a la vez, sin rótulo animado ni botón de pausa', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(message(page)).toHaveCount(0);
    await expect(bar(page).getByRole('button')).toHaveCount(0);
    await expect(bar(page).getByText(COLLECTION)).toBeVisible();
    await expect(bar(page).getByText(SHIPPING)).toBeVisible();
  });

  test('no cambia de mensaje aunque pase el tiempo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(message(page)).toHaveCount(0);
    await page.waitForTimeout(4600);
    await expect(bar(page).getByText(COLLECTION)).toBeVisible();
    await expect(bar(page).getByText(SHIPPING)).toBeVisible();
  });

  test('en móvil los dos mensajes se apilan sin salirse de la ventana', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/');
    await expect(message(page)).toHaveCount(0);
    const first = await bar(page).getByText(COLLECTION).boundingBox();
    const second = await bar(page).getByText(SHIPPING).boundingBox();
    expect(first?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((first?.x ?? 0) + (first?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(second?.y ?? 0).toBeGreaterThan(first?.y ?? 0);
  });
});
