import { describe, expect, it } from 'vitest';
import { ACTION_NAV, LEGAL_NAV, MAIN_NAV } from './navigation';

const allItems = [...MAIN_NAV, ...LEGAL_NAV, ...Object.values(ACTION_NAV)];

describe('navegación (RF-13)', () => {
  it('incluye Novedades y Ofertas como accesos de primer nivel', () => {
    const labels = MAIN_NAV.map((item) => item.label);
    expect(labels).toContain('Novedades');
    expect(labels).toContain('Ofertas');
  });

  it('todas las rutas son internas y absolutas', () => {
    for (const item of allItems) {
      expect(item.href.startsWith('/')).toBe(true);
      expect(item.href).not.toBe('/#');
    }
  });

  it('no hay rutas ni etiquetas repetidas', () => {
    const hrefs = allItems.map((item) => item.href);
    const labels = allItems.map((item) => item.label);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('enlaces legales (RF-12, CA-34)', () => {
  it('incluye aviso legal, privacidad, cookies y condiciones', () => {
    expect(LEGAL_NAV.map((item) => item.label)).toEqual([
      'Aviso legal',
      'Privacidad',
      'Cookies',
      'Condiciones',
    ]);
  });
});
