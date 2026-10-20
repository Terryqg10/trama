import { expect, test, type APIRequestContext } from '@playwright/test';
import { searchHitsSchema } from '../src/lib/catalog/search';

// CA-106 (T-063): GET /api/search?q= devuelve [] con menos de 2 caracteres y, con 2 o más, hasta 5 productos activos
// cuyo nombre contiene el texto. Depende del catálogo de ejemplo (hay 8 «polera»).

async function search(request: APIRequestContext, q: string) {
  const response = await request.get(`/api/search?q=${encodeURIComponent(q)}`);
  return { response, body: (await response.json()) as unknown };
}

test.describe('API de búsqueda (CA-106)', () => {
  test('sin texto o con 1 carácter devuelve un array vacío', async ({ request }) => {
    for (const q of ['', ' ', 'a', ' a ']) {
      const { response, body } = await search(request, q);
      expect(response.status(), `estado con «${q}»`).toBe(200);
      expect(body).toEqual([]);
    }
    const sinParametro = await request.get('/api/search');
    expect(await sinParametro.json()).toEqual([]);
  });

  test('con 2 o más caracteres devuelve hasta 5 productos con id, slug, nombre, precio e imagen', async ({ request }) => {
    const { response, body } = await search(request, 'polera');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const hits = searchHitsSchema.parse(body);
    expect(hits).toHaveLength(5);
    for (const hit of hits) {
      expect(hit.name.toLowerCase()).toContain('polera');
      expect(hit.priceCents).toBeGreaterThan(0);
      expect(hit.image?.path).toMatch(/^\/images\/products\/.+\.webp$/);
      expect((hit.image?.alt ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  test('cada slug de la respuesta lleva a una ficha que existe', async ({ request }) => {
    const { body } = await search(request, 'abrigo');
    const hits = searchHitsSchema.parse(body);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) expect((await request.get(`/producto/${hit.slug}`)).status()).toBe(200);
  });

  test('no distingue mayúsculas y tolera espacios', async ({ request }) => {
    const base = searchHitsSchema.parse((await search(request, 'abrigo')).body);
    const other = searchHitsSchema.parse((await search(request, '  ABRIGO  ')).body);
    expect(other.map((hit) => hit.id)).toEqual(base.map((hit) => hit.id));
  });

  test('sin coincidencias devuelve un array vacío', async ({ request }) => {
    expect((await search(request, 'zzzzzz')).body).toEqual([]);
  });

  test('los comodines son texto: «%», «_» y «*» no devuelven el catálogo', async ({ request }) => {
    for (const q of ['%%', '__', '**', '%a', '_a']) {
      expect((await search(request, q)).body, `con «${q}»`).toEqual([]);
    }
  });

  test('un texto larguísimo o con HTML no rompe la API', async ({ request }) => {
    for (const q of ['x'.repeat(5000), '<script>alert(1)</script>', "'; drop table products; --"]) {
      const { response, body } = await search(request, q);
      expect(response.status(), `estado con «${q.slice(0, 20)}»`).toBe(200);
      expect(body).toEqual([]);
    }
  });

  test('la respuesta se puede cachear en el borde unos segundos', async ({ request }) => {
    const { response } = await search(request, 'camiseta');
    expect(response.headers()['cache-control']).toContain('s-maxage=30');
  });
});
