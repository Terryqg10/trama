import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

// CA-112 y CA-113 (T-068): banner dividido bajo Explora, con dos slides de dos tarjetas y fundido cruzado cada 5 s.
// El cambio automático se prueba en tiempo real (`motion` no interviene, pero la transición CSS necesita reloj real).

const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const banner = (page: Page) => page.getByTestId('dual-banner');
const slide = (page: Page, index: number) => page.getByTestId('dual-banner-slide').nth(index);
const dot = (page: Page, index: number) => banner(page).getByRole('button', { name: `Ir al slide ${index + 1}` });

async function open(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await expect(banner(page)).toBeAttached();
  await banner(page).scrollIntoViewIfNeeded();
  // El temporizador y los puntos funcionan cuando React ha hidratado.
  await expect(banner(page)).toHaveAttribute('data-ready', 'true');
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('estructura (CA-112)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('está bajo Explora y antes de «Prepárate para el frío»', async ({ page }) => {
    await open(page);
    const explore = await page.getByRole('region', { name: 'Explora' }).boundingBox();
    const dual = await banner(page).boundingBox();
    const cold = await page.getByTestId('cold-section').boundingBox();
    expect(dual?.y ?? 0).toBeGreaterThan((explore?.y ?? 0) + (explore?.height ?? 0) - 1);
    expect((dual?.y ?? 0) + (dual?.height ?? 0)).toBeLessThanOrEqual((cold?.y ?? 0) + 1);
  });

  test('a 768 px o más son dos columnas iguales; por debajo se apilan', async ({ page }) => {
    for (const [width, columns] of [
      [1280, 2],
      [1024, 2],
      [768, 2],
      [767, 1],
      [375, 1],
      [320, 1],
    ] as const) {
      await open(page, width);
      const cards = slide(page, 0).getByTestId('dual-banner-card');
      const boxes = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number }));
      expect(boxes).toHaveLength(2);
      const lefts = new Set(boxes.map((box) => Math.round(box.x)));
      expect(lefts.size, `columnas a ${width}px`).toBe(columns);
      if (columns === 2) expect(Math.abs((boxes[0]?.width ?? 0) - (boxes[1]?.width ?? 0))).toBeLessThanOrEqual(1);
      expect(await overflow(page), `scroll a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('cada tarjeta tiene la foto cubriendo todo el contenedor, subtítulo, título grande y botón con enlace', async ({ page }) => {
    await open(page);
    for (let index = 0; index < 2; index++) {
      if (index > 0) await dot(page, index).click();
      for (const [i, card] of (await slide(page, index).getByTestId('dual-banner-card').all()).entries()) {
        const img = card.locator('img');
        await img.scrollIntoViewIfNeeded();
        const info = await img.evaluate(async (el) => {
          if (!(el instanceof HTMLImageElement)) return null;
          await el.decode().catch(() => undefined);
          const box = el.getBoundingClientRect();
          return { loaded: el.naturalWidth > 0, src: el.currentSrc, fit: getComputedStyle(el).objectFit, width: box.width, height: box.height };
        });
        const cardBox = await card.boundingBox();
        expect(info?.loaded, `foto de la tarjeta ${index}-${i}`).toBe(true);
        expect(info?.src).toContain('split-banner');
        expect(info?.fit).toBe('cover');
        expect(Math.abs((info?.width ?? 0) - (cardBox?.width ?? 0))).toBeLessThanOrEqual(1);
        expect(Math.abs((info?.height ?? 0) - (cardBox?.height ?? 0))).toBeLessThanOrEqual(1);
        await expect(card.getByRole('heading', { level: 3 })).toBeVisible();
        const fontSize = await card.getByRole('heading', { level: 3 }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeGreaterThanOrEqual(30);
        await expect(card.locator('[data-testid="dual-banner-text"] > p')).toHaveCount(2);
        const link = card.getByRole('link');
        expect(((await link.getAttribute('href')) ?? '').startsWith('/')).toBe(true);
        expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('cada botón lleva a una página que existe', async ({ page }) => {
    await open(page);
    const targets = [
      [0, 0, /\/novedades$/],
      [0, 1, /\/hombre\?categoria=sudaderas$/],
      [1, 0, /\/mujer\?categoria=jerseis$/],
      [1, 1, /\/novedades$/],
    ] as const;
    for (const [index, cardIndex, url] of targets) {
      await open(page);
      if (index > 0) await dot(page, index).click();
      await slide(page, index).getByTestId('dual-banner-card').nth(cardIndex).getByRole('link').click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  for (const width of [375, 768, 1280]) {
    test(`el texto sobre las fotos cumple AA (4,5:1) en los dos slides a ${width} px`, async ({ page }) => {
      await open(page, width);
      for (let index = 0; index < 2; index++) {
        if (index > 0) await dot(page, index).click();
        await expect(slide(page, index)).toHaveCSS('opacity', '1');
        for (const card of await slide(page, index).getByTestId('dual-banner-card').all()) {
          await card.scrollIntoViewIfNeeded();
          await card.locator('img').evaluate((el) => (el instanceof HTMLImageElement ? el.decode().catch(() => undefined) : undefined));
          for (const selector of ['p', 'h3']) {
            const target: Locator = card.locator(`[data-testid="dual-banner-text"] ${selector}`).first();
            const worst = await minContrast(card, target);
            expect(worst, `contraste de «${selector}» en el slide ${index + 1} a ${width}px`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    });
  }
});

// Peor contraste entre el color del texto y los píxeles reales de detrás: se oculta el texto, se captura la tarjeta
// (no la página: en el WebKit móvil un recorte de página sale en blanco) y se recorta el rectángulo del texto.
async function minContrast(card: Locator, target: Locator): Promise<number> {
  const textColor = await target.evaluate((el) => getComputedStyle(el).color);
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
  const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
  await target.evaluate((el) => el.setAttribute('style', 'color: transparent !important'));
  const rect = await target.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    const host = el.closest('[data-testid="dual-banner-card"]')?.getBoundingClientRect();
    return { x: r.x - (host?.x ?? 0), y: r.y - (host?.y ?? 0), width: r.width, height: r.height, hostWidth: host?.width ?? 1 };
  });
  const shot = await card.screenshot();
  const scale = ((await sharp(shot).metadata()).width ?? rect.hostWidth) / rect.hostWidth;
  const { data, info } = await sharp(shot)
    .extract({
      left: Math.round(rect.x * scale),
      top: Math.round(rect.y * scale),
      width: Math.max(1, Math.round(rect.width * scale)),
      height: Math.max(1, Math.round(rect.height * scale)),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let worst = Infinity;
  for (let i = 0; i < data.length; i += info.channels) {
    worst = Math.min(worst, contrast(textL, luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)));
  }
  await target.evaluate((el) => el.removeAttribute('style'));
  return worst;
}

test.describe('cambio automático con fundido (CA-113)', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a los ~5 s pasa al segundo slide con un fundido (opacidad intermedia) y luego vuelve al primero', async ({ page }) => {
    await open(page);
    await expect(banner(page)).toHaveAttribute('data-active', '0');
    const samples = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const result: number[] = [];
          const first = document.querySelectorAll('[data-testid="dual-banner-slide"]')[0];
          const timer = window.setInterval(() => {
            if (first) result.push(Number(getComputedStyle(first).opacity));
          }, 50);
          window.setTimeout(() => {
            window.clearInterval(timer);
            resolve(result);
          }, 7500);
        }),
    );
    await expect(banner(page)).toHaveAttribute('data-active', '1');
    // Hubo opacidades intermedias (fundido, no corte) y acabó en 0.
    expect(samples.some((value) => value > 0.05 && value < 0.95)).toBe(true);
    expect(samples.at(-1)).toBe(0);
    await expect(banner(page)).toHaveAttribute('data-active', '0', { timeout: 9000 });
  });

  test('el slide que no se ve no recibe foco ni se lee, y el que se ve sí', async ({ page }) => {
    await open(page);
    await expect(slide(page, 1)).toHaveAttribute('inert', '');
    await expect(slide(page, 0)).not.toHaveAttribute('inert', '');
    const canFocus = (index: number) =>
      slide(page, index)
        .getByRole('link')
        .first()
        .evaluate((el) => {
          if (!(el instanceof HTMLElement)) return false;
          el.focus();
          return document.activeElement === el;
        });
    expect(await canFocus(1)).toBe(false);
  });

  test('los puntos eligen el slide y el activo lleva aria-current', async ({ page }) => {
    await open(page);
    await dot(page, 1).click();
    await expect(banner(page)).toHaveAttribute('data-active', '1');
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    await expect(dot(page, 0)).not.toHaveAttribute('aria-current', 'true');
    await expect(slide(page, 1)).toHaveCSS('opacity', '1', { timeout: 3000 });
  });

  test('el botón de pausa lo detiene y el de reanudar lo retoma', async ({ page }) => {
    await open(page);
    await banner(page).getByRole('button', { name: 'Pausar el cambio automático del banner' }).click();
    await page.mouse.move(5, 5);
    await expect(banner(page)).toHaveAttribute('data-playing', 'false');
    await page.waitForTimeout(6000);
    await expect(banner(page)).toHaveAttribute('data-active', '0');
    await banner(page).getByRole('button', { name: 'Reanudar el cambio automático del banner' }).click();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.mouse.move(5, 5);
    await expect(banner(page)).toHaveAttribute('data-playing', 'true');
    await expect(banner(page)).toHaveAttribute('data-active', '1', { timeout: 9000 });
  });

  test('se detiene con el ratón encima y con el foco dentro', async ({ page }) => {
    await open(page);
    await slide(page, 0).hover();
    await expect(banner(page)).toHaveAttribute('data-playing', 'false');
    await page.waitForTimeout(6000);
    await expect(banner(page)).toHaveAttribute('data-active', '0');
    await page.mouse.move(5, 5);
    await expect(banner(page)).toHaveAttribute('data-playing', 'true');
    await slide(page, 0).getByRole('link').first().focus();
    await expect(banner(page)).toHaveAttribute('data-playing', 'false');
  });

  test('los controles miden al menos 44 × 44 px', async ({ page }) => {
    await open(page);
    for (const button of await banner(page).getByTestId('dual-banner-controls').getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('con prefers-reduced-motion (CA-113)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('no cambia solo, no hay botón de pausa y la transición está desactivada', async ({ page }) => {
    await open(page);
    await expect(banner(page).getByRole('button', { name: /cambio automático/ })).toHaveCount(0);
    await page.waitForTimeout(5800);
    await expect(banner(page)).toHaveAttribute('data-active', '0');
    const transition = await slide(page, 0).evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe('none');
    await dot(page, 1).click();
    await expect(banner(page)).toHaveAttribute('data-active', '1');
    await expect(slide(page, 1)).toHaveCSS('opacity', '1');
  });
});
