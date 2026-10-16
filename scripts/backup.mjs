#!/usr/bin/env node
// Hace un pg_dump de la base de datos del proyecto.

import { spawn } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKUPS_DIR = path.join(ROOT, 'backups');

function error(m) { process.stderr.write(`[backup] x ${m}\n`); }
function ok(m)    { process.stdout.write(`[backup] ok ${m}\n`); }
function log(m)   { process.stdout.write(`[backup] ${m}\n`); }

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    error('Falta DATABASE_URL en el entorno.');
    error('Ejemplo: DATABASE_URL=postgres://user:pass@host:5432/db pnpm run backup');
    process.exit(1);
  }

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const outfile = path.join(BACKUPS_DIR, `${timestamp()}.sql.gz`);

  log(`Volcando a ${path.relative(ROOT, outfile)}...`);

  const dump = spawn('pg_dump', ['--no-owner', '--no-acl', dbUrl], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const gz = createGzip();
  const out = fs.createWriteStream(outfile);

  dump.on('error', (err) => {
    if (err.code === 'ENOENT') {
      error('pg_dump no está en el PATH. Instala Postgres client tools.');
      process.exit(1);
    }
    error(err.message);
    process.exit(1);
  });

  try {
    await pipeline(dump.stdout, gz, out);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }

  await new Promise((resolve, reject) => {
    dump.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exit ${code}`))));
  });

  const stats = fs.statSync(outfile);
  ok(`Backup completado: ${path.relative(ROOT, outfile)} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
