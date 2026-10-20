import { test, expect, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

// CA-69 (T-037), CA-86, CA-87 y CA-88 (T-049): el hero de la portada es un slider a sangre de tres slides con foto,
// titular, subtítulo y botón; el texto sobre la foto es legible (contraste AA) sobre un degradado oscuro; flechas y
// puntos cambian de slide; y avanza solo cada 5 s salvo con prefers-reduced-motion.
//
// Salvo en «autoplay», los tests piden menos movimiento: así no hay cambios de slide inesperados y los saltos son
// instantáneos.

test.use({ reducedMotion: 'reduce' });

const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const SLIDES = [
  { title: 'Nueva colección', cta: 'Ver colección', href: '/novedades' },
  { title: 'Estilo urbano', cta: 'Ver hombre', href: '/hombre' },
  { title: 'Kawaii style', cta: 'Ver mujer', href: '/mujer' },
] as const;

const slider = (page: Page): Locator => page.getByTestId('hero-slider');
const slide = (page: Page, index: number): Locator => page.getByTestId('hero-slide').nth(index);
const dot = (page: Page, index: number): Locator => slider(page).getByRole('button', { name: new RegExp(`^Ir a la slide ${index + 1}:`) });

async function decodedImage(page: Page, index: number): Promise<string> {
  const img = slide(page, index).locator('img');
  await expect(img).toBeAttached();
  return img.evaluate(async (el) => {
    if (!(el instanceof HTMLImageElement)) return '';
    el.loading = 'eager';
    await el.decode().catch(() => undefined);
    return `${el.currentSrc}|${el.naturalWidth}`;
  });
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function goTo(page: Page, index: number): Promise<void> {
  await dot(page, index).click();
  await expect(dot(page, index)).toHaveAttribute('aria-current', 'true');
}

test.describe('Hero slider a sangre (CA-69, CA-86)', () => {
  test('la primera slide usa la foto vertical a 375 px y la horizontal a 1280 px, cargadas y sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const [mobileSrc, mobileWidth] = (await decodedImage(page, 0)).split('|');
    expect(mobileSrc).toMatch(/hero-coleccion-movil\.(avif|webp)$/);
    expect(Number(mobileWidth)).toBeGreaterThan(0);
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const [desktopSrc, desktopWidth] = (await decodedImage(page, 0)).split('|');
    expect(desktopSrc).toMatch(/hero-coleccion\.(avif|webp)$/);
    expect(Number(desktopWidth)).toBeGreaterThan(0);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('las tres slides tienen una foto cargada, con texto alternativo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('hero-slide')).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const [, width] = (await decodedImage(page, i)).split('|');
      expect(Number(width), `foto de la slide ${i + 1}`).toBeGreaterThan(0);
      const alt = await slide(page, i).locator('img').getAttribute('alt');
      expect((alt ?? '').trim().length, `alt de la slide ${i + 1}`).toBeGreaterThan(0);
    }
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`el slider ocupa todo el ancho de la ventana a ${width} px (a sangre)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const box = await slider(page).boundingBox();
      expect(box?.x ?? -1).toBeLessThanOrEqual(0.5);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(width - 1);
      expect(await overflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test('cada slide tiene su titular, subtítulo y botón con enlace válido; solo hay un h1', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Nueva colección' })).toBeInViewport();
    for (const [i, expected] of SLIDES.entries()) {
      const target = slide(page, i);
      await expect(target.getByRole('heading', { name: expected.title, includeHidden: true })).toHaveCount(1);
      await expect(target.locator('a')).toHaveAttribute('href', expected.href);
      await expect(target.locator('a')).toHaveText(expected.cta);
      const subtitle = await target.locator('[data-testid="hero-text"] p').textContent();
      expect((subtitle ?? '').trim().length).toBeGreaterThan(0);
    }
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
      await page.goto('/');
      await expect(page.getByText('Prendas urbanas para estrenar esta temporada')).toBeInViewport();
      await expect(page.getByRole('link', { name: 'Ver colección' })).toBeInViewport();
    }
  });

  test('cada botón lleva a una página que existe', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const [i, expected] of SLIDES.entries()) {
      await page.goto('/');
      if (i > 0) await goTo(page, i);
      await page.getByRole('link', { name: expected.cta }).click();
      await expect(page).toHaveURL(new RegExp(`${expected.href}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('el degradado usa un token del proyecto, no un negro del navegador', async ({ page }) => {
    await page.goto('/');
    const gradient = await slide(page, 0)
      .locator('div[aria-hidden="true"]')
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    // El token `fg` (#10222a) no es negro puro: su luminosidad en oklab (~0,24) es claramente mayor que 0.
    expect(gradient).toContain('linear-gradient');
    const lightness = Number(/oklab\(([\d.]+)/.exec(gradient)?.[1] ?? '0');
    expect(lightness).toBeGreaterThan(0.1);
  });

  // El texto va sobre la foto, así que axe no puede calcular el contraste. Se oculta el texto, se muestrea el fondo
  // real tras él y se compara el peor píxel con el color del texto (AA: 4,5:1), en cada slide.
  for (const width of [375, 768, 1024, 1280]) {
    test(`el texto sobre la foto cumple AA (4,5:1) en las tres slides a ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      for (let i = 0; i < 3; i++) {
        if (i > 0) await goTo(page, i);
        await decodedImage(page, i);
        for (const selector of ['[data-testid="hero-text"] p', '[data-testid="hero-text"] h1, [data-testid="hero-text"] h2']) {
          const target = slide(page, i).locator(selector);
          const textColor = await target.evaluate((el) => getComputedStyle(el).color);
          const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(textColor);
          expect(match, `color de ${selector}`).not.toBeNull();
          const textL = luminance(Number(match?.[1]), Number(match?.[2]), Number(match?.[3]));
          await target.evaluate((el) => {
            el.setAttribute('style', 'color: transparent !important');
          });
          // Rectángulo real del texto (no el del bloque, que ocupa todo el ancho de la slide).
          const box = await target.evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rect = range.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          });
          expect(box.width, `ancho del texto de ${selector}`).toBeGreaterThan(1);
          const png = await page.screenshot({
            clip: { x: box.x, y: box.y, width: box.width, height: box.height },
          });
          const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          let worst = Infinity;
          for (let p = 0; p < data.length; p += info.channels) {
            worst = Math.min(worst, contrast(textL, luminance(data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0)));
          }
          await target.evaluate((el) => {
            el.removeAttribute('style');
          });
          expect(worst, `contraste mínimo de ${selector} en la slide ${i + 1} a ${width}px`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

test.describe('Controles del slider (CA-87)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
  });

  test('las flechas y los puntos tienen nombre y miden al menos 44 × 44 px', async ({ page }) => {
    const controls = slider(page).getByRole('button');
    // Anterior, tres puntos y siguiente: con menos movimiento no hay botón de pausa (sale tras hidratar).
    await expect(controls).toHaveCount(5);
    const count = await controls.count();
    for (let i = 0; i < count; i++) {
      const button = controls.nth(i);
      expect(((await button.getAttribute('aria-label')) ?? '').length).toBeGreaterThan(0);
      const box = await button.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('la flecha siguiente avanza, la anterior retrocede y desde la primera se va a la última', async ({ page }) => {
    await slider(page).getByRole('button', { name: 'Slide siguiente' }).click();
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('heading', { level: 2, name: 'Estilo urbano' })).toBeInViewport();
    await slider(page).getByRole('button', { name: 'Slide anterior' }).click();
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    await slider(page).getByRole('button', { name: 'Slide anterior' }).click();
    await expect(dot(page, 2)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('heading', { level: 2, name: 'Kawaii style' })).toBeInViewport();
  });

  test('cada punto lleva a su slide y solo el activo lleva aria-current', async ({ page }) => {
    await goTo(page, 2);
    await expect(dot(page, 0)).not.toHaveAttribute('aria-current', 'true');
    await expect(dot(page, 1)).not.toHaveAttribute('aria-current', 'true');
    await goTo(page, 1);
    await expect(page.getByRole('link', { name: 'Ver hombre' })).toBeInViewport();
  });

  // Playwright no trata `inert` como oculto en el árbol de accesibilidad, así que se comprueba lo que importa: el foco.
  const canFocus = (page: Page, name: string): Promise<boolean> =>
    page.getByRole('link', { name, includeHidden: true }).evaluate((el) => {
      if (!(el instanceof HTMLElement)) return false;
      el.focus();
      return document.activeElement === el;
    });

  test('las slides que no se ven son inert: sus enlaces no reciben foco', async ({ page }) => {
    await expect(slide(page, 0)).not.toHaveAttribute('inert', '');
    await expect(slide(page, 1)).toHaveAttribute('inert', '');
    await expect(slide(page, 2)).toHaveAttribute('inert', '');
    expect(await canFocus(page, 'Ver hombre')).toBe(false);
    expect(await canFocus(page, 'Ver mujer')).toBe(false);
    expect(await canFocus(page, 'Ver colección')).toBe(true);
    await goTo(page, 1);
    expect(await canFocus(page, 'Ver colección')).toBe(false);
    expect(await canFocus(page, 'Ver hombre')).toBe(true);
  });

  test('con el teclado se llega a las flechas, los puntos y el botón de la slide', async ({ page }) => {
    await page.getByRole('link', { name: 'Ver colección' }).focus();
    await expect(page.getByRole('link', { name: 'Ver colección' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(slider(page).getByRole('button', { name: 'Slide anterior' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dot(page, 0)).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
  });
});

// El arrastre con ratón se prueba sin emulación táctil (en el móvil emulado el ratón no genera arrastres).
test.describe('Arrastre del slider (CA-87)', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('se puede arrastrar con el ratón para cambiar de slide', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    const box = await slide(page, 0).boundingBox();
    expect(box).not.toBeNull();
    const y = (box?.y ?? 0) + 200;
    await page.mouse.move(900, y);
    await page.mouse.down();
    await page.mouse.move(600, y, { steps: 8 });
    await page.mouse.move(250, y, { steps: 8 });
    await page.mouse.up();
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('Autoplay (CA-88)', () => {
  test.use({ reducedMotion: 'no-preference' });

  // Reloj simulado: tras hidratar se pausa y se avanza a mano, sin esperar 5 s reales por cambio. El temporizador
  // nace al hidratar, así que hay que esperar a React (no basta con ver el HTML del servidor).
  async function openWithClock(page: Page): Promise<void> {
    await page.clock.install();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="hero-slider"]');
      return root !== null && Object.keys(root).some((key) => key.startsWith('__reactFiber'));
    });
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    const fakeNow = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(fakeNow + 2000));
    // Con la carga lenta, el temporizador pudo nacer varios segundos antes de pausar. Dos cambios manuales (por código,
    // sin ratón ni foco) lo reinician en el instante pausado: desde aquí la cuenta de 5 s es exacta.
    for (const index of [1, 0]) {
      await dot(page, index).evaluate((el) => {
        if (el instanceof HTMLElement) el.click();
      });
      await expect(dot(page, index)).toHaveAttribute('aria-current', 'true');
    }
  }

  test('avanza solo cada 5 s y vuelve a la primera tras la última', async ({ page }) => {
    await openWithClock(page);
    await page.clock.runFor(2000);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    await page.clock.runFor(3500);
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    await page.clock.runFor(5000);
    await expect(dot(page, 2)).toHaveAttribute('aria-current', 'true');
    await page.clock.runFor(5000);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
  });

  // Con ratón real: sin emulación táctil (en el móvil emulado el ratón no genera los eventos de entrada y salida).
  test.describe('con ratón', () => {
    test.use({ hasTouch: false, isMobile: false });

    // El WebKit móvil emulado no entrega la salida del puntero tras mover el ratón, y en un móvil real no hay hover
    // (el puntero táctil no pausa: lo cubre el test unitario «un toque no lo detiene»). Se prueba en escritorio.
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name === 'mobile', 'sin hover en el WebKit móvil emulado');
    });

    test('se detiene con el botón de pausa y se reanuda con el de reanudar', async ({ page }) => {
      await openWithClock(page);
      await slider(page).getByRole('button', { name: 'Pausar el cambio automático' }).click();
      await page.clock.runFor(20_000);
      await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
      await slider(page).getByRole('button', { name: 'Reanudar el cambio automático' }).click();
      // El foco y el ratón siguen en el botón (dentro del slider): se sacan para que no cuenten como pausa.
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await page.mouse.move(5, 5);
      await page.clock.runFor(5500);
      await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    });

    test('se detiene con el ratón encima', async ({ page }) => {
      await openWithClock(page);
      await page.mouse.move(640, 300);
      await page.clock.runFor(20_000);
      await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
      await page.mouse.move(640, 790);
      await page.mouse.move(5, 5);
      await page.clock.runFor(5500);
      await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    });

  });

  test('se detiene con el foco dentro del slider', async ({ page }) => {
    await openWithClock(page);
    await page.getByRole('link', { name: 'Ver colección' }).focus();
    await page.clock.runFor(20_000);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
  });

  test('con prefers-reduced-motion no hay autoplay ni botón de pausa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openWithClock(page);
    await page.clock.runFor(30_000);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    await expect(slider(page).getByRole('button', { name: /cambio automático/ })).toHaveCount(0);
  });
});

// CA-114 (T-069): las flechas están a los lados de la foto y los puntos (con la pausa) abajo y centrados, todo dentro de
// la imagen, por encima del degradado (z-index 10), con 44 px y contraste suficiente con la foto real.
test.describe('Controles dentro de la imagen (CA-114)', () => {
  const prev = (page: Page) => page.getByTestId('hero-prev');
  const next = (page: Page) => page.getByTestId('hero-next');
  const pill = (page: Page) => page.getByTestId('hero-controls');

  for (const width of [320, 375, 767, 768, 1280, 1920]) {
    test(`a ${width} px las flechas están a los lados y los puntos abajo y centrados, dentro de la foto`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
      await decodedImage(page, 0);
      const area = await slider(page).boundingBox();
      const left = await prev(page).boundingBox();
      const right = await next(page).boundingBox();
      const dots = await pill(page).boundingBox();
      expect(area && left && right && dots).toBeTruthy();
      if (!area || !left || !right || !dots) return;
      const inside = (b: { x: number; y: number; width: number; height: number }): boolean =>
        b.x >= area.x - 0.5 && b.y >= area.y - 0.5 && b.x + b.width <= area.x + area.width + 0.5 && b.y + b.height <= area.y + area.height + 0.5;
      expect(inside(left), 'flecha izquierda dentro de la foto').toBe(true);
      expect(inside(right), 'flecha derecha dentro de la foto').toBe(true);
      expect(inside(dots), 'puntos dentro de la foto').toBe(true);
      // Una a cada lado.
      expect(left.x - area.x).toBeLessThanOrEqual(30);
      expect(area.x + area.width - (right.x + right.width)).toBeLessThanOrEqual(30);
      // Verticalmente: centradas desde 768 px y en el tercio superior en móvil (para no tapar el texto).
      const centreY = left.y + left.height / 2 - area.y;
      if (width >= 768) expect(Math.abs(centreY - area.height / 2)).toBeLessThanOrEqual(3);
      else expect(centreY).toBeLessThanOrEqual(area.height * 0.4);
      // Los puntos, abajo y centrados.
      expect(Math.abs(dots.x + dots.width / 2 - (area.x + area.width / 2))).toBeLessThanOrEqual(2);
      expect(area.y + area.height - (dots.y + dots.height)).toBeLessThanOrEqual(24);
      expect(dots.y).toBeGreaterThan(area.y + area.height / 2);
    });
  }

  test('las flechas y los puntos están por encima del degradado (z-index 10) y miden 44 × 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    for (const target of [prev(page), next(page), pill(page)]) {
      expect(await target.evaluate((el) => getComputedStyle(el).zIndex)).toBe('10');
      expect(await target.evaluate((el) => getComputedStyle(el).position)).toBe('absolute');
    }
    for (const target of [prev(page), next(page)]) {
      const box = await target.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('ninguna flecha ni punto tapa el texto ni el botón de la slide', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await decodedImage(page, 0);
      // Se mide el texto real (con un Range), no la caja del bloque, que ocupa todo el ancho disponible.
      const text = await slide(page, 0).getByTestId('hero-text').locator('h1, p, a').evaluateAll((items) =>
        items.map((item) => {
          const range = document.createRange();
          range.selectNodeContents(item);
          return range.getBoundingClientRect().toJSON() as { x: number; y: number; right: number; bottom: number };
        }),
      );
      for (const target of [prev(page), next(page), pill(page)]) {
        const b = await target.boundingBox();
        if (!b) throw new Error('sin caja');
        for (const t of text) {
          const overlap = b.x < t.right && b.x + b.width > t.x && b.y < t.bottom && b.y + b.height > t.y;
          expect(overlap, `controles sobre el texto a ${width}px`).toBe(false);
        }
      }
    }
  });

  test('el contraste de los controles con la foto real es de al menos 3:1 (iconos blancos sobre bg-fg/70)', async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
      for (let index = 0; index < 3; index++) {
        if (index > 0) await goTo(page, index);
        await decodedImage(page, index);
        for (const target of [prev(page), next(page), pill(page)]) {
          const shot = await target.screenshot();
          const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          const at = (x: number, y: number): number => {
            const i = (Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * info.channels;
            return luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
          };
          // Fondo de la píldora o del círculo: muestras cerca de los bordes (lejos del icono), a media altura y arriba/abajo.
          const samples = [at(8, Math.floor(info.height / 2)), at(info.width - 9, Math.floor(info.height / 2)), at(Math.floor(info.width / 2), 8), at(Math.floor(info.width / 2), info.height - 9)];
          const white = luminance(255, 255, 255);
          for (const sample of samples) expect(contrast(white, sample), `contraste a ${width}px, slide ${index + 1}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  test('el hero mantiene su alto: la foto y el slider miden lo mismo (los controles no empujan nada)', async ({ page }) => {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await decodedImage(page, 0);
      const area = await slider(page).boundingBox();
      const image = await slide(page, 0).locator('img').boundingBox();
      expect(Math.abs((area?.height ?? 0) - (image?.height ?? 99))).toBeLessThanOrEqual(1);
    }
  });
});
