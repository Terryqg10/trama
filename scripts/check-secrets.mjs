#!/usr/bin/env node
// Ejecuta gitleaks sobre el repo. Si gitleaks no está instalado, avisa y
// sale con código 0 (no bloquea el flujo local). En CI (CI=true) sí bloquea.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function log(msg) { process.stdout.write(`[check-secrets] ${msg}\n`); }
function warn(msg) { process.stdout.write(`[check-secrets] ! ${msg}\n`); }
function error(msg) { process.stderr.write(`[check-secrets] x ${msg}\n`); }

function commandExists(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, ['version'], { stdio: 'ignore' });
    let done = false;
    child.on('error', () => { if (!done) { done = true; resolve(false); } });
    child.on('exit', (code) => { if (!done) { done = true; resolve(code === 0); } });
  });
}

function runGitleaks(args) {
  return new Promise((resolve) => {
    const child = spawn('gitleaks', args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') resolve({ available: false });
      else { error(err.message); resolve({ available: true, code: 1 }); }
    });
    child.on('exit', (code) => resolve({ available: true, code: code ?? 1 }));
  });
}

async function main() {
  const strict = process.env.CI === 'true' || process.env.CI === '1';
  const available = await commandExists('gitleaks');

  if (!available) {
    warn('gitleaks no está instalado. No se puede comprobar el repo.');
    warn('Instálalo con: scoop install gitleaks (Windows), brew install gitleaks (macOS), o binario portable.');
    if (strict) {
      error('En CI (CI=true), gitleaks es obligatorio. Falla.');
      process.exit(1);
    }
    log('Comprobación omitida. Continuando.');
    process.exit(0);
  }

  log('Ejecutando gitleaks...');
  const result = await runGitleaks([
    'detect',
    '--no-banner',
    '--redact',
    '--config', path.join(PROJECT_ROOT, '.gitleaks.toml'),
  ]);

  if (!result.available) {
    error('gitleaks desapareció entre comprobaciones.');
    process.exit(strict ? 1 : 0);
  }

  if (result.code === 0) {
    log('Sin secretos detectados.');
    process.exit(0);
  }

  error('gitleaks encontró posibles secretos. Revisa el informe.');
  error('Los secretos reales NO deben commitearse nunca (invariante I4).');
  process.exit(1);
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
