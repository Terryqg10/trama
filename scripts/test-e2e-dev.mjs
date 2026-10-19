import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwright = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

const child = spawn(process.execPath, [playwright, 'test', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, E2E_DEV: '1' },
});

child.on('exit', (code) => process.exit(code ?? 1));
