import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { z } from 'zod';

// CA-74 (T-040): botón «Volver arriba» sobre la barra fija de la ficha en móvil. Datos del seed `catalog-demo.sql`.

const FICHA = '/producto/polo-pique-basico?color=negro&talla=M';

async function open(page: Page, width: number, height = 800): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(FICHA);
  await expect(page.getByTestId('add-to-cart')).toBeEnabled();
}

async function scrollToScreens(page: Page, screens: number): Promise<void> {
  await page.evaluate((n) => window.scrollTo(0, window.innerHeight * n), screens);
}

async function spyScrollTo(page: Page): Promise<void> {
  await page.evaluate(() => {
    const original = window.scrollTo.bind(window);
    const calls: unknown[] = [];
    Object.assign(window, { __scrollCalls: calls });
    window.scrollTo = ((...args: unknown[]) => {
      calls.push(args[0]);
      return (original as (...a: unknown[]) => void)(...args);
    }) as typeof window.scrollTo;
  });
}

const scrollCallsSchema = z.array(z.object({ top: z.number(), behavior: z.string() }));

async function scrollCalls(page: Page): Promise<Array<{ top: number; behavior: string }>> {
  const raw = await page.evaluate(() => JSON.stringify(Reflect.get(window, '__scrollCalls')));
  return scrollCallsSchema.parse(JSON.parse(raw));
}

test.describe('«Volver arriba» en la ficha en móvil (CA-74)', () => {
  test('oculto arriba, aparece pasada pantalla y media y se oculta al volver arriba', async ({ page }) => {
    await open(page, 375);
    const button = page.getByTestId('back-to-top');
    await expect(button).toHaveAttribute('aria-hidden', 'true');
    await expect(button).toHaveCSS('opacity', '0');

    await scrollToScreens(page, 1.2);
    await expect(button).toHaveAttribute('aria-hidden', 'true');

    await scrollToScreens(page, 1.8);
    await expect(button).toHaveAttribute('aria-hidden', 'false');
    await expect(button).toHaveCSS('opacity', '1');
    await expect(button).toBeInViewport();
    await expect(button).toHaveAccessibleName('Volver arriba');

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(button).toHaveAttribute('aria-hidden', 'true');
  });

  test('lleva al inicio de la ficha con desplazamiento suave y el botón se oculta al llegar', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, 375);
    await scrollToScreens(page, 2);
    const button = page.getByTestId('back-to-top');
    await expect(button).toHaveAttribute('aria-hidden', 'false');
    await spyScrollTo(page);

    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    const calls = await scrollCalls(page);
    expect(calls).toEqual([{ top: 0, behavior: 'smooth' }]);
    await expect(button).toHaveAttribute('aria-hidden', 'true');
    // El foco no se pierde: pasa al primer enlace de la ficha.
    await expect(page.locator('main a').first()).toBeFocused();
  });

  test('con prefers-reduced-motion el desplazamiento es instantáneo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 375);
    await scrollToScreens(page, 2);
    const button = page.getByTestId('back-to-top');
    await expect(button).toHaveAttribute('aria-hidden', 'false');
    await spyScrollTo(page);

    await button.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    expect(await scrollCalls(page)).toEqual([{ top: 0, behavior: 'auto' }]);
  });

  test('es una zona táctil de al menos 44 px y no se sale del viewport a 320 y 375 px', async ({ page }) => {
    for (const width of [320, 375]) {
      await open(page, width);
      await scrollToScreens(page, 2);
      const button = page.getByTestId('back-to-top');
      await expect(button).toHaveCSS('opacity', '1');
      const box = await button.boundingBox();
      expect(box?.width ?? 0, `ancho a ${width}px`).toBeGreaterThanOrEqual(43.5);
      expect(box?.height ?? 0, `alto a ${width}px`).toBeGreaterThanOrEqual(43.5);
      expect((box?.x ?? 0) + (box?.width ?? 0), `borde derecho a ${width}px`).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  for (const width of [768, 1280]) {
    test(`a ${width} px no hay botón «Volver arriba»`, async ({ page }) => {
      await open(page, width);
      await scrollToScreens(page, 2);
      await expect(page.getByTestId('back-to-top')).toBeHidden();
    });
  }

  test('con el botón visible no hay violaciones graves de axe', async ({ page }) => {
    await open(page, 375);
    await scrollToScreens(page, 2);
    await expect(page.getByTestId('back-to-top')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('back-to-top')).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('sticky-add-to-cart')).toHaveCSS('opacity', '1');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
