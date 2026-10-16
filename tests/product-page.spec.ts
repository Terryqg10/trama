import { test, expect, type Page } from '@playwright/test';
import { expectNoReload, markDocument } from './helpers/no-reload';

// SPEC-001 T-005b: ficha de producto (RF-02, CA-03). Datos del seed `catalog-demo.sql`:
// «polo-pique-basico» (hombre, azul/blanco/negro, tallas S a XL, XL negro agotado, 29,90 €).

const SLUG = 'polo-pique-basico';
const URL = `/producto/${SLUG}`;
const WIDTHS = [320, 375, 768, 1280] as const;

async function open(page: Page, url: string, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('tarjetas del listado enlazadas a la ficha', () => {
  test('pulsar una tarjeta abre su ficha', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/hombre');
    const card = page.locator('article', { hasText: 'Polo piqué básico' });
    await expect(card).toBeVisible();
    // Enlace extendido: se puede pulsar en cualquier punto de la tarjeta, no solo en el nombre.
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    await expect(page).toHaveURL(new RegExp(`/producto/${SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Polo piqué básico' })).toBeVisible();
  });

  test('«Volver a Hombre» regresa al listado', async ({ page }) => {
    await open(page, URL);
    await page.getByRole('link', { name: 'Volver a Hombre' }).click();
    await expect(page).toHaveURL(/\/hombre$/);
  });
});

test.describe('contenido de la ficha (RF-02)', () => {
  test('muestra nombre, descripción, precio con IVA incluido y la imagen con alt', async ({ page }) => {
    await open(page, URL);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Polo piqué básico');
    await expect(page.getByText('Polo de manga corta en piqué de algodón')).toBeVisible();
    await expect(page.getByText('IVA incluido').first()).toBeVisible();
    await expect(page.locator('main').getByText('29,90').first()).toBeVisible();
    const image = page.locator('main img').first();
    await expect(image).toBeVisible();
    expect(((await image.getAttribute('alt')) ?? '').length).toBeGreaterThan(0);
  });

  test('el título de la página es el nombre del producto', async ({ page }) => {
    await open(page, URL);
    await expect(page).toHaveTitle(/Polo piqué básico/);
  });

  test('incluye el bloque de envío y devolución (CA-29)', async ({ page }) => {
    await open(page, URL);
    const block = page.getByRole('region', { name: 'Envío y devolución' });
    await expect(block).toBeVisible();
    await expect(block).toContainText('30 días');
  });

  test('no hay botón «Añadir al carrito» hasta T-018 ni botones muertos', async ({ page }) => {
    await open(page, URL);
    await expect(page.getByRole('button', { name: /añadir/i })).toHaveCount(0);
  });

  test('la imagen principal se carga con prioridad (LCP)', async ({ page }) => {
    await open(page, URL);
    const image = page.locator('main img').first();
    await expect(image).toHaveAttribute('fetchpriority', 'high');
    expect(await image.getAttribute('loading')).not.toBe('lazy');
  });
});

test.describe('selección de color y talla (CA-03)', () => {
  test('sin parámetros hay un color elegido y ninguna talla', async ({ page }) => {
    await open(page, URL);
    const color = page.getByRole('group', { name: /Color/ });
    await expect(color.locator('a[aria-current="true"]')).toHaveCount(1);
    const talla = page.getByRole('group', { name: /Talla/ });
    await expect(talla.locator('a[aria-current="true"]')).toHaveCount(0);
    await expect(page.getByText('Elige una talla para ver la disponibilidad.')).toBeVisible();
  });

  test('elegir una talla con stock la marca y muestra la disponibilidad', async ({ page }) => {
    await open(page, URL);
    await page.getByRole('group', { name: /Talla/ }).getByRole('link', { name: 'M', exact: true }).click();
    await expect(page).toHaveURL(/talla=M/);
    const status = page.getByTestId('variant-status');
    await expect(status).toContainText('En stock');
    await expect(status).toContainText('29,90');
    await expect(
      page.getByRole('group', { name: /Talla/ }).getByRole('link', { name: 'M', exact: true }),
    ).toHaveAttribute('aria-current', 'true');
  });

  test('una talla sin stock está deshabilitada, no es un enlace y por URL no se elige', async ({
    page,
  }) => {
    await open(page, `${URL}?color=negro`);
    const talla = page.getByRole('group', { name: /Talla/ });
    // XL negro está agotado en el seed.
    await expect(talla.getByRole('link', { name: 'XL' })).toHaveCount(0);
    const disabled = talla.locator('[aria-disabled="true"]', { hasText: 'XL' });
    await expect(disabled).toBeVisible();
    await expect(disabled).toContainText('agotada');

    await open(page, `${URL}?color=negro&talla=XL`);
    await expect(page.getByRole('group', { name: /Talla/ }).locator('a[aria-current="true"]')).toHaveCount(0);
    await expect(page.getByText('Elige una talla para ver la disponibilidad.')).toBeVisible();
  });

  test('cambiar de color cambia la imagen y quita la talla', async ({ page }) => {
    await open(page, `${URL}?color=azul&talla=M`);
    await expect(page.locator('main img').first()).toHaveAttribute('alt', /color azul/);
    await page.getByRole('group', { name: /Color/ }).getByRole('link', { name: 'Negro' }).click();
    await expect(page).toHaveURL(/color=negro/);
    await expect(page).not.toHaveURL(/talla=/);
    await expect(page.locator('main img').first()).toHaveAttribute('alt', /color negro/);
  });

  test('valores inválidos en la URL se ignoran, sin error', async ({ page }) => {
    await open(page, `${URL}?color=rojo&talla=XXXL`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Polo piqué básico');
    await expect(page.getByRole('alert').filter({ hasText: /no son válidos/ })).toHaveCount(0);
  });

  test('cambiar la selección no recarga el documento ni salta el scroll', async ({ page }) => {
    await open(page, URL, 375);
    await markDocument(page);
    await page.evaluate(() => {
      window.scrollTo(0, 150);
    });
    await page.getByRole('group', { name: /Talla/ }).getByRole('link', { name: 'L', exact: true }).click();
    await expect(page).toHaveURL(/talla=L/);
    await expectNoReload(page);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});

test.describe('datos de ajuste (CA-33, T-028)', () => {
  test('muestra la altura y la talla del modelo junto a composición y cuidados', async ({ page }) => {
    await open(page, URL);
    const block = page.getByRole('region', { name: 'Ajuste y cuidados' });
    await expect(block).toBeVisible();
    await expect(block.getByText('Mide 1,85 m y lleva la talla M')).toBeVisible();
    await expect(block.getByText('100% algodón')).toBeVisible();
    await expect(block.getByText('Lavar a 30 °C. No usar lejía. Secar tendido.')).toBeVisible();
    expect(await block.getByRole('term').allInnerTexts()).toEqual(['Modelo', 'Composición', 'Cuidados']);
  });

  test('cada producto muestra sus propios datos', async ({ page }) => {
    await open(page, '/producto/blusa-lino-casual');
    const block = page.getByRole('region', { name: 'Ajuste y cuidados' });
    await expect(block.getByText('Mide 1,75 m y lleva la talla S')).toBeVisible();
    await expect(block.getByText('100% lino')).toBeVisible();
  });

  test('no escribe «null» ni «undefined» en la ficha', async ({ page }) => {
    await open(page, URL);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\bnull\b|\bundefined\b/);
  });

  test('el bloque no desborda a 320 px y sus textos se leen enteros', async ({ page }) => {
    await open(page, URL, 320);
    const block = page.getByRole('region', { name: 'Ajuste y cuidados' });
    const box = await block.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(320.5);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('los datos de ajuste siguen ahí al elegir color y talla', async ({ page }) => {
    await open(page, `${URL}?color=negro&talla=M`);
    await expect(page.getByRole('region', { name: 'Ajuste y cuidados' })).toBeVisible();
  });
});

test.describe('círculos de color (CA-57, T-030, test color-swatches)', () => {
  const swatches = (page: Page) => page.getByRole('group', { name: /Color/ }).locator('a[data-swatch]');
  const dot = (page: Page, color: string) =>
    page.getByRole('group', { name: /Color/ }).locator(`a[data-swatch="${color}"] > span[aria-hidden="true"]`);

  test('cada color del producto es un círculo y su enlace conserva el nombre accesible', async ({
    page,
  }) => {
    await open(page, URL);
    await expect(swatches(page)).toHaveCount(3);
    for (const name of ['Azul', 'Blanco', 'Negro']) {
      await expect(page.getByRole('group', { name: /Color/ }).getByRole('link', { name })).toBeVisible();
    }
    // Ya no hay chips de texto de color: el texto del nombre solo está para lectores de pantalla.
    await expect(page.getByRole('group', { name: /Color/ }).locator('a:not([data-swatch])')).toHaveCount(0);
  });

  test('el círculo tiene el color real del token, no un color cualquiera', async ({ page }) => {
    await open(page, URL);
    for (const color of ['azul', 'blanco', 'negro']) {
      const actual = await dot(page, color).evaluate((el) => getComputedStyle(el).backgroundColor);
      // Se resuelve el token en un elemento de prueba y se compara el color calculado.
      const expected = await page.evaluate((name) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = `var(--color-swatch-${name})`;
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      }, color);
      expect(actual, `color del círculo «${color}»`).toBe(expected);
      expect(actual).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('los círculos de colores distintos tienen colores distintos', async ({ page }) => {
    await open(page, URL);
    const colors = await Promise.all(
      ['azul', 'blanco', 'negro'].map((c) => dot(page, c).evaluate((el) => getComputedStyle(el).backgroundColor)),
    );
    expect(new Set(colors).size).toBe(3);
  });

  test('el círculo mide 28 px con borde y el enlace, al menos 44×44 px', async ({ page }) => {
    await open(page, URL, 375);
    const first = swatches(page).first();
    const link = await first.boundingBox();
    expect(link?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(link?.height ?? 0).toBeGreaterThanOrEqual(44);
    const dotBox = await dot(page, 'azul').boundingBox();
    expect(Math.round(dotBox?.width ?? 0)).toBe(28);
    expect(Math.round(dotBox?.height ?? 0)).toBe(28);
    const border = await dot(page, 'blanco').evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(border).toBe('1px');
  });

  test('el color elegido lleva aria-current y un anillo; los demás, ni uno ni otro', async ({ page }) => {
    await open(page, `${URL}?color=negro`);
    await expect(page.locator('a[data-swatch="negro"]')).toHaveAttribute('aria-current', 'true');
    const ring = await dot(page, 'negro').evaluate((el) => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe('none');
    await expect(page.locator('a[data-swatch="azul"]')).not.toHaveAttribute('aria-current', 'true');
    const noRing = await dot(page, 'azul').evaluate((el) => getComputedStyle(el).boxShadow);
    expect(noRing).toBe('none');
  });

  test('el subtexto con el nombre del color está siempre visible, también al entrar', async ({ page }) => {
    await open(page, URL);
    const label = page.locator('#ficha-color');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Color: Azul');
  });

  test('pulsar otro círculo cambia el color elegido, la imagen y el subtexto', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('#ficha-color')).toHaveText('Color: Azul');
    await expect(page.locator('main img').first()).toHaveAttribute('alt', /color azul/);

    await page.getByRole('group', { name: /Color/ }).getByRole('link', { name: 'Negro' }).click();

    await expect(page).toHaveURL(/color=negro/);
    await expect(page.locator('#ficha-color')).toHaveText('Color: Negro');
    await expect(page.locator('main img').first()).toHaveAttribute('alt', /color negro/);
    await expect(page.locator('a[data-swatch="negro"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('a[data-swatch="azul"]')).not.toHaveAttribute('aria-current', 'true');
  });

  test('cada color del catálogo de ejemplo tiene círculo (ninguno cae a chip de texto)', async ({ page }) => {
    // Productos del seed con colores distintos: azul, beige, blanco, burdeos, gris, negro y verde.
    for (const slug of [
      'polo-pique-basico',
      'polo-punto-manga-larga',
      'pantalon-chino-slim',
      'blusa-lino-casual',
      'blusa-satinada-vestir',
      'polo-punto-mujer',
    ]) {
      await open(page, `/producto/${slug}`);
      const links = page.getByRole('group', { name: /Color/ }).locator('a');
      const total = await links.count();
      expect(total, slug).toBeGreaterThan(0);
      await expect(page.getByRole('group', { name: /Color/ }).locator('a[data-swatch]'), slug).toHaveCount(total);
    }
  });

  test('sin JavaScript los círculos siguen siendo enlaces que cambian el color', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(URL);
    await page.getByRole('group', { name: /Color/ }).getByRole('link', { name: 'Blanco' }).click();
    await expect(page).toHaveURL(/color=blanco/);
    await expect(page.locator('#ficha-color')).toHaveText('Color: Blanco');
    await context.close();
  });
});

test.describe('404 de la ficha', () => {
  for (const slug of ['no-existe-este-producto', 'Slug_Invalido!', '..%2F..%2Fetc']) {
    test(`/producto/${slug} da 404 con enlace al catálogo`, async ({ page }) => {
      const response = await page.goto(`/producto/${slug}`);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible();
      await page.getByRole('link', { name: 'Ver el catálogo' }).click();
      await expect(page).toHaveURL(/\/novedades$/);
    });
  }
});

test.describe('sin JavaScript', () => {
  test('la ficha se ve y la selección funciona con enlaces', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Polo piqué básico' })).toBeVisible();
    await page.getByRole('group', { name: /Talla/ }).getByRole('link', { name: 'M', exact: true }).click();
    await expect(page).toHaveURL(/talla=M/);
    await expect(page.getByTestId('variant-status')).toContainText('En stock');
    await context.close();
  });
});

test.describe('interfaz de la ficha', () => {
  for (const width of WIDTHS) {
    test(`sin desbordamiento horizontal a ${width} px`, async ({ page }) => {
      await open(page, `${URL}?color=azul&talla=M`, width);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test('en escritorio imagen e información van en dos columnas; en móvil, apiladas', async ({
    page,
  }) => {
    await open(page, URL, 1280);
    const imageBox = await page.locator('main img').first().boundingBox();
    const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(imageBox && titleBox ? imageBox.x + imageBox.width <= titleBox.x : false).toBe(true);

    await open(page, URL, 375);
    const mobileImage = await page.locator('main img').first().boundingBox();
    const mobileTitle = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(mobileImage && mobileTitle ? mobileImage.y + mobileImage.height <= mobileTitle.y + 1 : false).toBe(
      true,
    );
  });

  test('los enlaces y controles de selección miden al menos 44 px', async ({ page }) => {
    await open(page, URL, 375);
    const controls = page.locator('main').locator('[role="group"] a, [role="group"] [aria-disabled="true"]');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box?.height ?? 0, `control ${i} alto`).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, `control ${i} ancho`).toBeGreaterThanOrEqual(44);
    }
  });
});
