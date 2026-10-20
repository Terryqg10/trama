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

// Enmienda 22: hay nueve categorías, pero las guías de tallas de ejemplo solo cubren las cuatro originales. Las
// categorías nuevas no tienen guía y la ficha no muestra el enlace (getSizeGuide devuelve null).
const WITH_GUIDE = ['polos', 'camisas', 'blusas', 'pantalones'] as const;

describe('seed de guías de tallas', () => {
  it('trae las cuatro categorías originales y ninguna categoría desconocida', () => {
    const keys = Object.keys(readGuides()).sort();
    expect(keys).toEqual([...WITH_GUIDE].sort());
    for (const key of keys) expect(CATEGORIES.some((category) => category === key)).toBe(true);
  });

  for (const category of WITH_GUIDE) {
    it(`la guía de «${category}» cumple el esquema`, () => {
      expect(parseSizeGuide(readGuides()[category])).not.toBeNull();
    });
  }

  it('las categorías nuevas no tienen guía en el seed', () => {
    const withGuide: readonly string[] = WITH_GUIDE;
    for (const category of CATEGORIES.filter((c) => !withGuide.includes(c))) {
      expect(readGuides()[category]).toBeUndefined();
    }
  });

  it('las medidas están marcadas como de ejemplo', () => {
    for (const category of WITH_GUIDE) {
      expect(parseSizeGuide(readGuides()[category])?.note).toContain('ejemplo');
    }
  });
});
