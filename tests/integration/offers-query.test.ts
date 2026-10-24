import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isOffer } from '../../src/lib/catalog/discount';
import { getOfferProducts } from '../../src/lib/catalog/queries';
import { publicClient } from './helpers';

// CA-01 (T-099): solo lectura, con la clave pública. No crea ni borra datos de la BD compartida.

const rowsSchema = z.array(z.object({ product_id: z.string(), price_cents: z.number(), compare_at_cents: z.number().nullable() }));

describe('getOfferProducts (CA-01)', () => {
  it('devuelve exactamente los productos activos con alguna variante rebajada, sin duplicados', async () => {
    const client = publicClient();
    const offers = await getOfferProducts(client);

    const variants = await client
      .from('product_variants')
      .select('product_id, price_cents, compare_at_cents')
      .not('compare_at_cents', 'is', null);
    expect(variants.error).toBeNull();
    const expectedIds = new Set(
      rowsSchema
        .parse(variants.data)
        .filter((row) => row.compare_at_cents !== null && row.compare_at_cents > row.price_cents)
        .map((row) => row.product_id),
    );

    const ids = offers.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(expectedIds);
    for (const product of offers) {
      expect(isOffer(product)).toBe(true);
      // Trae todas las variantes, no solo las rebajadas (la tarjeta necesita todas las tallas).
      expect(product.variants.length).toBeGreaterThan(0);
    }
  });
});
