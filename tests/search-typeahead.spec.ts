import { expect, test, type Locator, type Page } from '@playwright/test';

// CA-107 y CA-108 (T-064): buscador con sugerencias. Escritorio (≥ 1024 px): lista flotante bajo el campo. Móvil
// (< 1024 px): pantalla completa con las sugerencias debajo. Depende del catálogo de ejemplo (hay 8 «polera»
// y dos «abrigo»). La región aria-live del buscador no usa role="status": muchas pruebas esperan que no haya ninguno (carga).

const field = (page: Page) => page.locator('header').getByRole('combobox', { name: 'Buscar productos' }).first();
const panelField = (page: Page) => page.getByTestId('search-panel').getByRole('combobox', { name: 'Buscar productos' });
const options = (page: Page) => page.getByRole('option');

// En el WebKit móvil, React puede reponer el valor del campo al terminar de hidratar y borrar lo escrito: se reintenta
// hasta que el texto se queda.
async function typeInto(input: Locator, text: string): Promise<void> {
  await expect(async () => {
    await input.fill(text);
    await expect(input).toHaveValue(text, { timeout: 1000 });
  }).toPass();
}

async function open(page: Page, width: number, url = '/'): Promise<void> {
  await page.setViewportSize({ width, height: width < 768 ? 812 : 800 });
  await page.goto(url);
  await expect(page.getByRole('main')).toBeVisible();
  // El buscador solo reacciona cuando React ha hidratado.
  await expect(page.locator('header input[role="combobox"][data-ready="true"]').first()).toBeAttached();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('sugerencias en escritorio (CA-107)', () => {
  test('con 2 o más caracteres y tras 300 ms se abre la lista con miniatura, nombre y precio (máx. 5)', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'polera');
    await expect(options(page)).toHaveCount(6); // 5 productos + «Ver todos los resultados»
    const products = options(page).filter({ hasNot: page.getByText('Ver todos') });
    await expect(products).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const option = products.nth(i);
      await expect(option.locator('img')).toHaveCount(1);
      expect(((await option.locator('img').getAttribute('src')) ?? '').length).toBeGreaterThan(0);
      expect((await option.innerText()).toLowerCase()).toContain('polera');
      await expect(option).toContainText(/\d+,\d{2}\s?€/);
    }
    await expect(options(page).last()).toContainText('Ver todos los resultados para «polera»');
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('con 1 carácter no se pide nada ni se abre la lista', async ({ page }) => {
    await open(page, 1280);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/search')) requests.push(request.url());
    });
    await typeInto(field(page), 'c');
    await page.waitForTimeout(700);
    expect(requests).toEqual([]);
    await expect(page.getByTestId('search-suggestions').first()).toBeHidden();
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('espera 300 ms tras la última tecla: escribir seguido hace una sola petición', async ({ page }) => {
    await open(page, 1280);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/search')) requests.push(new URL(request.url()).searchParams.get('q') ?? '');
    });
    await field(page).click();
    await field(page).pressSequentially('abrigo', { delay: 60 });
    await expect(options(page).first()).toBeVisible();
    expect(requests).toEqual(['abrigo']);
  });

  test('un clic en una sugerencia lleva a su ficha', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    const first = options(page).first();
    const name = (await first.locator('span').nth(1).innerText()).trim();
    await first.click();
    await expect(page).toHaveURL(/\/producto\//);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });

  test('sin coincidencias dice «No encontramos nada, prueba con otra palabra»', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'zzzzzz');
    await expect(page.getByText('No encontramos nada, prueba con otra palabra')).toBeVisible();
    await expect(options(page)).toHaveCount(0);
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('Intro sin sugerencia activa busca en /buscar con el texto', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    await field(page).press('Enter');
    await expect(page).toHaveURL(/\/buscar\?q=abrigo$/);
  });

  test('«Ver todos los resultados» lleva a /buscar', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await options(page).last().click();
    await expect(page).toHaveURL(/\/buscar\?q=abrigo$/);
  });
});

test.describe('combobox accesible (CA-107)', () => {
  test('roles y estados ARIA: combobox, aria-expanded, aria-controls, listbox y opciones', async ({ page }) => {
    await open(page, 1280);
    await expect(field(page)).toHaveAttribute('role', 'combobox');
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(field(page)).toHaveAttribute('aria-autocomplete', 'list');
    const controls = await field(page).getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    await expect(field(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`[id="${controls}"]`)).toHaveAttribute('role', 'listbox');
    // El foco se queda en el campo.
    await expect(field(page)).toBeFocused();
  });

  test('las flechas mueven la opción activa (aria-activedescendant) y Intro la abre', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    await expect(field(page)).not.toHaveAttribute('aria-activedescendant', /.+/);
    await field(page).press('ArrowDown');
    const first = await options(page).first().getAttribute('id');
    await expect(field(page)).toHaveAttribute('aria-activedescendant', first ?? '');
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
    await field(page).press('ArrowDown');
    await expect(options(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'false');
    await field(page).press('ArrowUp');
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
    await field(page).press('Enter');
    await expect(page).toHaveURL(/\/producto\//);
  });

  test('ArrowUp desde ninguna opción va a la última y las flechas dan la vuelta', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    await field(page).press('ArrowUp');
    await expect(options(page).last()).toHaveAttribute('aria-selected', 'true');
    await field(page).press('ArrowDown');
    await expect(field(page)).not.toHaveAttribute('aria-activedescendant', /.+/);
  });

  test('Esc cierra la lista y deja el foco en el campo; salir del campo también la cierra', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    await field(page).press('Escape');
    await expect(options(page)).toHaveCount(0);
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(field(page)).toBeFocused();
    await field(page).press('ArrowDown');
    await typeInto(field(page), 'abrigo largo');
    await expect(options(page).first()).toBeVisible();
    await page.mouse.click(5, 400);
    await expect(options(page)).toHaveCount(0);
  });

  test('se anuncia el número de sugerencias en una región aria-live', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(page.locator('header p[aria-live="polite"]').first()).toHaveText(/\d+ sugerencias?/);
  });

  test('el campo se alcanza con Tab y la lista no tiene opciones tabulables (el foco no sale del campo)', async ({ page }) => {
    await open(page, 1280);
    await typeInto(field(page), 'abrigo');
    await expect(options(page).first()).toBeVisible();
    for (const index of [0, 1]) await expect(options(page).nth(index)).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('pantalla completa en móvil (CA-108)', () => {
  const trigger = (page: Page) => page.getByTestId('search-open');
  const panel = (page: Page) => page.getByTestId('search-panel');

  test('la lupa abre el buscador a pantalla completa con el campo enfocado', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    const box = await panel(page).boundingBox();
    expect([box?.x, box?.y, box?.width, box?.height]).toEqual([0, 0, 375, 812]);
    await expect(panelField(page)).toBeFocused();
  });

  test('las sugerencias salen debajo del campo, dentro de la pantalla, y elegir una cierra el panel', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await typeInto(panelField(page), 'abrigo');
    const list = panel(page).getByRole('option');
    await expect(list.first()).toBeVisible();
    const fieldBox = await panelField(page).boundingBox();
    const optionBox = await list.first().boundingBox();
    expect(optionBox?.y ?? 0).toBeGreaterThan((fieldBox?.y ?? 0) + (fieldBox?.height ?? 0));
    expect((optionBox?.x ?? -1) + (optionBox?.width ?? 0)).toBeLessThanOrEqual(375);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
    await list.first().click();
    await expect(page).toHaveURL(/\/producto\//);
    await expect(panel(page)).toBeHidden();
  });

  test('sin coincidencias muestra el mensaje en la pantalla completa', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await typeInto(panelField(page), 'zzzzzz');
    await expect(panel(page).getByText('No encontramos nada, prueba con otra palabra')).toBeVisible();
  });

  test('Esc cierra primero la lista y después el panel, y el foco vuelve a la lupa', async ({ page }) => {
    await open(page, 375);
    await trigger(page).click();
    await typeInto(panelField(page), 'abrigo');
    await expect(panel(page).getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page).getByRole('option')).toHaveCount(0);
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('de 320 a 1023 px no hay scroll horizontal con las sugerencias abiertas', async ({ page }) => {
    for (const width of [320, 375, 767, 768, 1023]) {
      await open(page, width);
      await trigger(page).click();
      await typeInto(panelField(page), 'camiseta');
      await expect(panel(page).getByRole('option').first()).toBeVisible();
      expect(await overflow(page), `scroll a ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('a 1024 px o más no hay lupa: el campo está en la cabecera', async ({ page }) => {
    await open(page, 1024);
    await expect(trigger(page)).toBeHidden();
    await expect(field(page)).toBeVisible();
  });
});
