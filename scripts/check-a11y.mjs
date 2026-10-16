#!/usr/bin/env node
// check-a11y.mjs — Ejecuta Playwright con la spec de accesibilidad.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function log(m)   { process.stdout.write(`[check-a11y] ${m}\n`); }
function error(m) { process.stderr.write(`[check-a11y] x ${m}\n`); }

// Se resuelve con require.resolve: con pnpm, `playwright` no está en la raíz de
// node_modules, solo `@playwright/test` (dependencia directa).
let playwrightCli;
try {
  playwrightCli = createRequire(path.join(ROOT, 'package.json')).resolve('@playwright/test/cli');
} catch {
  error('No se encuentra Playwright. Ejecuta pnpm install primero.');
  process.exit(1);
}

const specPath = path.join(ROOT, 'tests', 'a11y.spec.ts');
if (!fs.existsSync(specPath)) {
  error(`No existe ${path.relative(ROOT, specPath)}.`);
  process.exit(1);
}

log('Ejecutando tests/a11y.spec.ts vía Playwright...');

const child = spawn(
  process.execPath,
  [playwrightCli, 'test', 'tests/a11y.spec.ts'],
  { cwd: ROOT, stdio: 'inherit' },
);

child.on('error', (err) => {
  error(err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) log('Sin violaciones graves ni críticas.');
  process.exit(code ?? 1);
});
