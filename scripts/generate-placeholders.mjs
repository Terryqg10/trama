#!/usr/bin/env node
// Genera las imágenes placeholder de producto (SVG) en public/products/.
// Una por categoría y color: <categoria>-<color>.svg. Sin texto, marcas ni
// recursos externos. Se sustituyen por fotos reales cuando existan.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'products');

// Colores de las prendas (son imágenes de producto, no colores de interfaz).
const COLORS = {
  azul: '#4a6f8f',
  beige: '#c9b79c',
  blanco: '#f1efe9',
  burdeos: '#7a2e3b',
  gris: '#8d9199',
  negro: '#2a2c30',
  verde: '#5d7a63',
};

const mirror = (x) => 400 - x;

// Camiseta/polo/camisa/blusa con mangas parametrizadas.
function top({ outer, inner, armpitY, bottomLeft, bottomRight, neckDepth }) {
  const [ox, oy] = outer;
  const [ix, iy] = inner;
  return [
    'M130 90',
    'L90 115',
    `L${ox} ${oy}`,
    `L${ix} ${iy}`,
    `L120 ${armpitY}`,
    `L${bottomLeft} 440`,
    `L${bottomRight} 440`,
    `L${mirror(120)} ${armpitY}`,
    `L${mirror(ix)} ${iy}`,
    `L${mirror(ox)} ${oy}`,
    'L310 115',
    'L270 90',
    `Q200 ${neckDepth} 130 90`,
    'Z',
  ].join(' ');
}

const SHAPES = {
  polos: {
    body: top({ outer: [40, 200], inner: [85, 230], armpitY: 200, bottomLeft: 120, bottomRight: 280, neckDepth: 130 }),
    detail: (fill) =>
      `<path d="M130 90 L200 150 L270 90 L255 80 L200 120 L145 80 Z" fill="${fill}" fill-opacity="0.18" stroke="#000" stroke-opacity="0.2"/>` +
      '<path d="M200 150 V215" stroke="#000" stroke-opacity="0.25" stroke-width="3"/>' +
      '<circle cx="200" cy="170" r="4" fill="#000" fill-opacity="0.3"/><circle cx="200" cy="195" r="4" fill="#000" fill-opacity="0.3"/>',
  },
  camisas: {
    body: top({ outer: [30, 370], inner: [75, 385], armpitY: 210, bottomLeft: 118, bottomRight: 282, neckDepth: 125 }),
    detail: () =>
      '<path d="M130 90 L180 140 L200 95 L220 140 L270 90 L255 78 L200 108 L145 78 Z" fill="#fff" fill-opacity="0.35" stroke="#000" stroke-opacity="0.2"/>' +
      '<path d="M200 108 V440" stroke="#000" stroke-opacity="0.25" stroke-width="3"/>' +
      [160, 210, 260, 310, 360].map((y) => `<circle cx="200" cy="${y}" r="4" fill="#000" fill-opacity="0.3"/>`).join(''),
  },
  blusas: {
    body: top({ outer: [55, 230], inner: [95, 255], armpitY: 215, bottomLeft: 100, bottomRight: 300, neckDepth: 195 }),
    detail: () =>
      '<path d="M130 90 Q200 195 270 90" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="3"/>' +
      '<path d="M150 420 Q200 400 250 420" fill="none" stroke="#000" stroke-opacity="0.15" stroke-width="3"/>',
  },
  pantalones: {
    body: 'M120 60 L280 60 L298 460 L215 460 L200 180 L185 460 L102 460 Z',
    detail: () =>
      '<rect x="120" y="60" width="160" height="28" fill="#000" fill-opacity="0.12"/>' +
      '<path d="M200 88 V180" stroke="#000" stroke-opacity="0.25" stroke-width="3"/>',
  },
};

function svgFor(category, colorHex) {
  const shape = SHAPES[category];
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">\n' +
    `  <path d="${shape.body}" fill="${colorHex}" stroke="#000" stroke-opacity="0.2" stroke-width="2" stroke-linejoin="round"/>\n` +
    `  ${shape.detail(colorHex)}\n` +
    '</svg>\n'
  );
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const category of Object.keys(SHAPES)) {
  for (const [color, hex] of Object.entries(COLORS)) {
    const file = path.join(OUT_DIR, `${category}-${color}.svg`);
    // Fuerza LF (regla de scripts del proyecto).
    fs.writeFileSync(file, svgFor(category, hex), { encoding: 'utf8' });
    count += 1;
  }
}

process.stdout.write(`[generate-placeholders] ok ${count} SVG en ${path.relative(ROOT, OUT_DIR)}\n`);
