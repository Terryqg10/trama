import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/catalog/queries';
import {
  MAX_SUGGESTIONS,
  MIN_SUGGEST_LENGTH,
  parseSearchQuery,
  searchHitsSchema,
  toSearchHit,
} from '@/lib/catalog/search';

/** Las sugerencias son públicas y iguales para todos: se cachean en el borde unos segundos. */
const CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=60';

/**
 * Sugerencias del buscador (RF-25, CA-106, T-063). `GET /api/search?q=`: con menos de 2 caracteres devuelve `[]`;
 * con 2 o más, hasta 5 productos activos cuyo nombre contiene el texto. La entrada se normaliza con
 * `parseSearchQuery` y la salida se valida con Zod. Un fallo de datos responde 500 sin detalle.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const query = parseSearchQuery(new URL(request.url).searchParams.get('q') ?? undefined);
  if (query.length < MIN_SUGGEST_LENGTH) {
    return NextResponse.json([], { headers: { 'Cache-Control': CACHE_CONTROL } });
  }

  try {
    const products = await searchProducts(query);
    const hits = searchHitsSchema.parse(products.slice(0, MAX_SUGGESTIONS).map(toSearchHit));
    return NextResponse.json(hits, { headers: { 'Cache-Control': CACHE_CONTROL } });
  } catch (error) {
    console.error('GET /api/search falló', error instanceof Error ? error.message : 'error desconocido');
    return NextResponse.json({ error: 'No se pudo buscar.' }, { status: 500 });
  }
}
