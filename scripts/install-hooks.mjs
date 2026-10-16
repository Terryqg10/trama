#!/usr/bin/env node
// Instala el hook pre-commit de git que ejecuta check-secrets.mjs.
// Sin husky, sin dependencias externas.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function log(msg) { process.stdout.write(`[install-hooks] ${msg}\n`); }
function error(msg) { process.stderr.write(`[install-hooks] x ${msg}\n`); }

async function gitDir() {
  try {
    const out = await new Promise((resolve, reject) => {
      const child = spawn('git', ['rev-parse', '--git-dir'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
      let stdout = '';
      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.on('exit', (code) => (code === 0 ? resolve(stdout.trim()) : reject(new Error('no es un repo git'))));
      child.on('error', reject);
    });
    return path.isAbsolute(out) ? out : path.join(PROJECT_ROOT, out);
  } catch {
    return null;
  }
}

const HOOK_CONTENT = `#!/usr/bin/env node
// Hook pre-commit generado por scripts/install-hooks.mjs.
// No editar a mano: se sobrescribe al reinstalar.

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const script = path.join(root, 'scripts', 'check-secrets.mjs');

const child = spawn(process.execPath, [script], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
`;

async function main() {
  const gd = await gitDir();
  if (!gd) {
    error('Este directorio no es un repositorio git. Ejecuta git init primero.');
    process.exit(1);
  }

  const hooksDir = path.join(gd, 'hooks');
  await fs.mkdir(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'pre-commit');
  await fs.writeFile(hookPath, HOOK_CONTENT, { mode: 0o755 });

  log(`Hook instalado en ${path.relative(PROJECT_ROOT, hookPath)}`);
  log('El hook ejecuta scripts/check-secrets.mjs antes de cada commit.');
  log('Para omitirlo puntualmente: git commit --no-verify (con criterio).');
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
