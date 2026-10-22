import { test, expect, type Page } from '@playwright/test';

// Estas pruebas dependen de los datos de ejemplo de `supabase/seed/catalog-demo.sql`.
// Si el catálogo cambia, hay que ajustar los nombres esperados.

/** Abre una URL del catálogo y espera a que el esqueleto de carga desaparezca. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole('status')).toHaveCount(0);
}

async function names(page: Page): Promise<string[]> {
  return page.locator('article h2').allInnerTexts();
}

// En escritorio los filtros van en la columna lateral (siempre visibles); en móvil, en un drawer
// que hay que abrir. Se abre solo si el botón «Filtros» es visible.
async function openFilters(page: Page): Promise<void> {
  const open = page.locator('[data-testid="filters-open"]');
  if (await open.isVisible()) {
    await open.click();
    await expect(page.locator('[data-testid="filters-drawer"]')).toBeVisible();
  }
}

const sorted = (values: string[]) => [...values].sort();

const BLUSAS_MUJER = ['Blusa de lino', 'Blusa de popelín con lazada', 'Blusa satinada'];
const NOVEDADES = ['Blusa de lino', 'Blusa satinada', 'Camisa de popelín', 'Polo piqué básico'];

test.describe('catálogo: listado conectado a la BD', () => {
  test('/mujer y /hombre muestran productos de su género', async ({ page }) => {
    await open(page, '/mujer');
    const mujer = await names(page);
    expect(mujer.length).toBeGreaterThan(0);
    expect(mujer).toContain('Blusa de lino');
    expect(mujer).not.toContain('Pantalón chino slim');

    await open(page, '/hombre');
    const hombre = await names(page);
    expect(hombre).toContain('Pantalón chino slim');
    expect(hombre).not.toContain('Blusa de lino');
  });

  test('el contador coincide con las tarjetas', async ({ page }) => {
    await open(page, '/mujer');
    const count = (await names(page)).length;
    await expect(page.getByText(`${count} productos`)).toBeVisible();
  });
});

test.describe('CA-01: mujer + blusas, solo blusas de mujer', () => {
  test('por URL', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    expect(sorted(await names(page))).toEqual(sorted(BLUSAS_MUJER));
  });

  test('desde el panel de filtros', async ({ page }) => {
    await open(page, '/mujer');
    await openFilters(page);
    // El chip se aplica al clic (SPEC-002 RF-03): no hace falta pulsar «Aplicar filtros».
    await page.locator('form:visible:not([role="search"])').getByText('Blusas', { exact: true }).click();
    await expect(page).toHaveURL(/categoria=blusas/);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect.poll(async () => sorted(await names(page))).toEqual(sorted(BLUSAS_MUJER));
  });

  test('las blusas de mujer no aparecen en /hombre', async ({ page }) => {
    await open(page, '/hombre?categoria=blusas');
    expect(await names(page)).toEqual([]);
  });
});

test.describe('CA-02: sin resultados, estado vacío con limpiar filtros', () => {
  test('muestra el mensaje y "Limpiar filtros" restablece el listado', async ({ page }) => {
    await open(page, '/mujer?categoria=pantalones&color=burdeos');
    await expect(page.getByText('No hay productos con estos filtros')).toBeVisible();
    expect(await names(page)).toEqual([]);

    await page.getByRole('link', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/mujer$/);
    expect((await names(page)).length).toBeGreaterThan(0);
  });
});

test.describe('CA-26: Novedades solo muestra productos nuevos', () => {
  test('lista exactamente los marcados como nuevos', async ({ page }) => {
    await open(page, '/novedades');
    expect(sorted(await names(page))).toEqual(sorted(NOVEDADES));
  });

  test('cada tarjeta lleva la insignia "Nuevo" como texto', async ({ page }) => {
    await open(page, '/novedades');
    await expect(page.getByText('Nuevo', { exact: true })).toHaveCount(NOVEDADES.length);
  });

  test('permite filtrar por género dentro de Novedades', async ({ page }) => {
    await open(page, '/novedades?genero=mujer');
    expect(sorted(await names(page))).toEqual(sorted(['Blusa de lino', 'Blusa satinada']));
  });
});

test.describe('CA-27: filtro de talla, solo productos con esa talla y stock', () => {
  test('hombre + talla XL excluye los pantalones (no tienen XL)', async ({ page }) => {
    await open(page, '/hombre?talla=XL');
    const result = await names(page);
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('Pantalón chino slim');
    expect(result).not.toContain('Pantalón de traje');
    expect(result).toContain('Polo piqué básico');
  });

  test('una talla agotada no cuenta: XS beige de la blusa de lino no tiene stock', async ({ page }) => {
    await open(page, '/mujer?talla=XS&color=beige');
    expect(await names(page)).toEqual([]);
    await open(page, '/mujer?talla=XS&color=blanco');
    expect(await names(page)).toContain('Blusa de lino');
  });
});

test.describe('CA-32: filtro de ocasión', () => {
  test('mujer + vestir incluye los productos de vestir y ninguno casual', async ({ page }) => {
    await open(page, '/mujer?ocasion=vestir');
    expect(sorted(await names(page))).toEqual(
      sorted(['Blusa satinada', 'Blusa de popelín con lazada', 'Pantalón fluido']),
    );
  });

  test('hombre + vestir', async ({ page }) => {
    await open(page, '/hombre?ocasion=vestir');
    expect(sorted(await names(page))).toEqual(
      sorted(['Polo de punto de manga larga', 'Camisa de popelín', 'Pantalón de traje']),
    );
  });
});

test.describe('orden y precio', () => {
  test('precio ascendente: el más barato primero', async ({ page }) => {
    await open(page, '/hombre?orden=precio-asc');
    // Con los productos nuevos (T-045) hay varios al mismo precio (29,90 €), así que se comprueba el orden de los
    // precios mostrados y no qué producto va primero.
    const prices = await page.locator('article').evaluateAll((cards) =>
      cards.map((card) => {
        // El precio actual es el primero de la zona de precio: con rebaja (T-076) va seguido del anterior tachado.
        const text = card.querySelector('[data-testid="card-price"]')?.textContent ?? '';
        const found = /(\d+),(\d{2})\s*€/.exec(text);
        return found ? Number(found[1]) * 100 + Number(found[2]) : -1;
      }),
    );
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBe(2990);
    // Con el seed de otoño (T-056) el más caro es el abrigo de paño (89,90 €).
    expect((await names(page)).at(-1)).toBe('Abrigo de paño gris');
  });

  test('precio descendente: el más caro primero', async ({ page }) => {
    await open(page, '/hombre?orden=precio-desc');
    expect((await names(page))[0]).toBe('Abrigo de paño gris');
  });

  test('rango de precios en euros', async ({ page }) => {
    await open(page, '/hombre?min=70&max=90');
    // Entre 70 y 90 €: el pantalón de traje y los dos productos de otoño de hombre (T-056).
    expect(sorted(await names(page))).toEqual(sorted(['Pantalón de traje', 'Chaqueta acolchada negra', 'Abrigo de paño gris']));
  });

  test('los precios se muestran en euros con coma decimal', async ({ page }) => {
    await open(page, '/hombre?min=70&max=90');
    await expect(page.locator('article').filter({ hasText: '79,90' }).first()).toBeVisible();
  });
});

test.describe('parámetros inválidos se ignoran (CA-09)', () => {
  test('un valor inválido se ignora: sin aviso y con el listado completo', async ({ page }) => {
    await open(page, '/hombre?genero=niño&min=-5');
    await expect(page.getByRole('alert').filter({ hasText: 'Algunos filtros' })).toHaveCount(0);
    expect((await names(page)).length).toBeGreaterThan(0);
  });

  test('un valor inválido no anula los filtros válidos de la misma URL', async ({ page }) => {
    await open(page, '/mujer?talla=XXXL&categoria=blusas');
    await expect(page.getByRole('alert').filter({ hasText: 'Algunos filtros' })).toHaveCount(0);
    expect(sorted(await names(page))).toEqual(sorted(BLUSAS_MUJER));
  });

  test('un intento de inyección en un filtro se ignora', async ({ page }) => {
    await open(page, "/mujer?talla=M'; drop table products;--");
    await expect(page.getByRole('alert').filter({ hasText: 'Algunos filtros' })).toHaveCount(0);
    expect((await names(page)).length).toBeGreaterThan(0);
  });

  test('el género de la ruta prevalece sobre el parámetro', async ({ page }) => {
    await open(page, '/hombre?genero=mujer');
    const result = await names(page);
    expect(result).not.toContain('Blusa de lino');
  });
});

// Decisión del usuario: se mantiene el esqueleto de carga (spec, sección 6). Con
// JavaScript desactivado, Next no sustituye el esqueleto por el contenido, así que
// la página NO llega a mostrarse sin JS. Lo que sí se comprueba es que el formulario
// es HTML puro (GET) y que el listado se renderiza en el servidor, sin peticiones
// del cliente. La limitación queda documentada en la review.
test.describe('formulario y listado renderizados en el servidor', () => {
  test('el HTML del servidor contiene un formulario GET con los controles y los productos', async ({
    request,
  }) => {
    const response = await request.get('/mujer?categoria=blusas');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toMatch(/<form[^>]*method="get"[^>]*action="\/mujer"|<form[^>]*action="\/mujer"[^>]*method="get"/);
    for (const control of ['categoria', 'ocasion', 'talla', 'color', 'min', 'max', 'orden']) {
      expect(html, `control ${control}`).toContain(`name="${control}"`);
    }
    expect(html).toContain('Aplicar filtros');
    for (const name of BLUSAS_MUJER) {
      expect(html, name).toContain(name);
    }
    expect(html).not.toContain('Pantalón fluido');
  });

  test('«Aplicar filtros» envía el formulario con los parámetros en la URL', async ({ page }) => {
    await open(page, '/mujer');
    await openFilters(page);
    await page.locator('form:visible [data-testid="price-max"]').fill('45');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(page).toHaveURL(/\/mujer\?.*max=45/);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect.poll(async () => (await names(page)).length).toBeGreaterThan(0);
  });
});

test.describe('interfaz del listado', () => {
  test('el panel de filtros muestra el número de filtros activos', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas&ocasion=vestir');
    await expect(page.locator('[data-testid^="filters-count"]:visible')).toHaveText('2 activos');
  });

  test('el chip seleccionado conserva su estado tras recargar', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    await openFilters(page);
    await expect(page.getByRole('radio', { name: 'Blusas' })).toBeChecked();
  });

  test('cada tarjeta tiene un único enlace a su ficha y ningún botón fuera de la compra rápida (T-005b, T-077)', async ({ page }) => {
    await open(page, '/mujer');
    const cards = page.locator('article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const links = cards.nth(i).locator('a');
      await expect(links).toHaveCount(1);
      expect(await links.first().getAttribute('href')).toMatch(/^\/producto\/[a-z0-9-]+$/);
    }
    // Enmienda 32 (T-077): los únicos botones de una tarjeta son los de su panel de compra rápida.
    await expect(page.locator('article button:not([data-testid^="quick-add"])')).toHaveCount(0);
  });

  test('todas las imágenes tienen texto alternativo', async ({ page }) => {
    await open(page, '/mujer');
    const images = page.locator('article img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt && alt.length > 0).toBe(true);
    }
  });

  test('no hay desbordamiento horizontal con el listado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page, '/mujer');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('los controles del formulario miden al menos 44 px de alto', async ({ page }) => {
    await open(page, '/mujer?categoria=blusas');
    await openFilters(page);
    // Espera a que el intervalo de precio sustituya a los campos de antes de hidratar (T-079): si no, el control puede desaparecer a mitad.
    await expect(page.locator('form:visible [data-testid="price-range"]').first()).toBeVisible();
    const controls = page
      .locator('form:visible:not([role="search"])')
      .first()
      .locator('button:visible, select:visible, input[type="number"]:visible, a:visible');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      expect(box?.height ?? 0, `control ${i}`).toBeGreaterThanOrEqual(44);
    }
  });
});
