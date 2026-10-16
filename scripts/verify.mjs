#!/usr/bin/env node
// verify.mjs — Comprobaciones del proyecto instanciado.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const fails = [];

function fail(msg) { process.stderr.write(`[verify] x ${msg}\n`); fails.push(msg); }
function ok(msg) { process.stdout.write(`[verify] ok ${msg}\n`); }
function log(msg) { process.stdout.write(`[verify] ${msg}\n`); }

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function checkStructure() {
  log('Comprobando estructura del proyecto...');
  const required = [
    'package.json',
    '.os-version',
    '.env.example',
    '.gitignore',
    '.gitleaks.toml',
    'docs/constitution.md',
    'design/styles/index.md',
    'sdd/README.md',
    'scripts/check-secrets.mjs',
    'scripts/install-hooks.mjs',
  ];
  for (const rel of required) {
    if (!(await exists(path.join(ROOT, rel)))) {
      fail(`falta: ${rel}`);
    }
  }
  if (fails.length === 0) ok('Estructura OK.');
}

async function checkPaletteExists() {
  log('Comprobando paleta...');
  const palette = path.join(ROOT, 'palette.css');
  if (!(await exists(palette))) {
    fail('falta palette.css — ver design/palette-rules.md');
    return;
  }
  const raw = await fs.readFile(palette, 'utf8');
  if (raw.includes('TODO')) {
    fail('palette.css contiene TODO sin resolver');
    return;
  }
  ok('palette.css presente y sin TODOs.');
}

async function main() {
  await checkStructure();
  await checkPaletteExists();

  process.stdout.write('\n');
  if (fails.length > 0) {
    process.stderr.write(`[verify] Fallos: ${fails.length}\n`);
    process.exit(1);
  }
  process.stdout.write('[verify] Todo OK.\n');
}

main().catch((err) => {
  process.stderr.write(`[verify] x ${err.message}\n`);
  process.exit(1);
});
