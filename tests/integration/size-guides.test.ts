import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/lib/catalog/filters';
import { getSizeGuide } from '../../src/lib/catalog/size-guide';
import { publicClient } from './helpers';

// SPEC-001 RF-18 / T-027: lectura pública de las guías de tallas. Requiere el seed
// `supabase/seed/size-guides-demo.sql` aplicado. Sin él, estos tests fallan (no se saltan).

describe('getSizeGuide: lectura pública del seed (T-027)', () => {
  for (const category of CATEGORIES) {
    it(`la categoría «${category}» tiene una guía válida`, async () => {
      const guide = await getSizeGuide(category, publicClient());
      expect(guide, `falta la guía de ${category}: ¿se aplicó el seed?`).not.toBeNull();
      expect(guide?.columns.length).toBeGreaterThan(0);
      expect(guide?.rows.length).toBeGreaterThan(0);
      for (const row of guide?.rows ?? []) {
        expect(row.values).toHaveLength(guide?.columns.length ?? -1);
      }
    });
  }

  it('las guías de distintas categorías son distintas', async () => {
    const [camisas, pantalones] = await Promise.all([
      getSizeGuide('camisas', publicClient()),
      getSizeGuide('pantalones', publicClient()),
    ]);
    expect(camisas?.columns).not.toEqual(pantalones?.columns);
  });
});
