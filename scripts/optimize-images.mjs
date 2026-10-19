#!/usr/bin/env node
// optimize-images.mjs — Convierte los originales de public/images/raw/ (fuera de Git) a AVIF y
// WebP en public/images/products/ y public/images/hero/ (los archivos hero-*). ADR-009.

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { OptimizeError, optimizeImages } from './lib/optimize-images.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'public', 'images', 'raw');
const OUT_ROOT = path.join(ROOT, 'public', 'images');

function log(m) { process.stdout.write(`[optimize-images] ${m}\n`); }
function error(m) { process.stderr.write(`[optimize-images] x ${m}\n`); }
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

try {
  const results = await optimizeImages({ rawDir: RAW_DIR, outRoot: OUT_ROOT });
  for (const r of results) {
    if (r.skipped) {
      log(`= ${r.file} (sin cambios) -> ${r.group}/`);
    } else {
      log(`${r.file} ${kb(r.originalBytes)} -> ${r.group}/ avif ${kb(r.bytes.avif)}, webp ${kb(r.bytes.webp)} (${r.width}x${r.height})`);
    }
  }
  const done = results.filter((r) => !r.skipped).length;
  log(`${results.length} originales, ${done} optimizados, ${results.length - done} sin cambios.`);
} catch (err) {
  if (err instanceof OptimizeError) {
    error(err.message);
  } else {
    error(err instanceof Error ? err.message : String(err));
  }
  process.exit(1);
}
