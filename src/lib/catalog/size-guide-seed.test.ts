import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './filters';
import { parseSizeGuide } from './size-guide';

// El seed de ejemplo (T-027) tiene que cumplir el esquema que lee la ficha: así un cambio en uno
// de los dos no deja la ficha sin guía sin que ningún test lo detecte.

const SEED = path.join(process.cwd(), 'supabase', 'seed', 'size-guides-demo.json');

function readGuides(): Record<string, unknown> {
  const raw: unknown = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  if (typeof raw !== 'object' || raw === null || !('guides' in raw)) throw new Error('Seed sin «guides»');
  const guides = raw.guides;
  if (typeof guides !== 'object' || guides === null) throw new Error('«guides» no es un objeto');
  return Object.fromEntries(Object.entries(guides));
}

describe('seed de guías de tallas', () => {
  it('trae exactamente las cuatro categorías', () => {
    expect(Object.keys(readGuides()).sort()).toEqual([...CATEGORIES].sort());
  });

  for (const category of CATEGORIES) {
    it(`la guía de «${category}» cumple el esquema`, () => {
      expect(parseSizeGuide(readGuides()[category])).not.toBeNull();
    });
  }

  it('las medidas están marcadas como de ejemplo', () => {
    for (const category of CATEGORIES) {
      expect(parseSizeGuide(readGuides()[category])?.note).toContain('ejemplo');
    }
  });
});
