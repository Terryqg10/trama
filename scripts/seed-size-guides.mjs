#!/usr/bin/env node
// Aplica las guías de tallas de ejemplo (T-027) a la BD de Supabase.
// Idempotente: solo inserta las categorías que NO tienen guía; nunca pisa una existente.
// Usa la clave de servicio, que se lee de las variables de entorno del proyecto (mismo mecanismo
// que los tests de integración: `vite.loadEnv`). Nunca imprime valores de variables.
// Datos: supabase/seed/size-guides-demo.json (única fuente). Uso: `pnpm run seed:size-guides`.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'supabase', 'seed', 'size-guides-demo.json');
const CATEGORIES = ['polos', 'camisas', 'blusas', 'pantalones'];

function fail(message) {
  process.stderr.write(`[seed-size-guides] x ${message}\n`);
  process.exit(1);
}
function log(message) {
  process.stdout.write(`[seed-size-guides] ${message}\n`);
}

function readSeed() {
  const raw = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const guides = raw.guides;
  if (typeof guides !== 'object' || guides === null) fail('El seed no tiene «guides».');
  for (const category of CATEGORIES) {
    const guide = guides[category];
    if (!guide || !Array.isArray(guide.columns) || !Array.isArray(guide.rows) || guide.rows.length === 0) {
      fail(`El seed no tiene una guía válida para «${category}».`);
    }
  }
  return guides;
}

async function main() {
  const env = loadEnv('development', ROOT, '');
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail('Falta NEXT_PUBLIC_SUPABASE_URL en el entorno del proyecto.');
  if (!serviceKey) fail('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del proyecto.');

  const guides = readSeed();
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await client.from('size_guides').select('category');
  if (existing.error) fail(`No se pudo leer size_guides: ${existing.error.message}`);
  const present = new Set((existing.data ?? []).map((row) => row.category));

  const missing = CATEGORIES.filter((category) => !present.has(category));
  for (const category of CATEGORIES.filter((c) => present.has(c))) {
    log(`= ${category}: ya tiene guía, no se toca.`);
  }
  if (missing.length === 0) {
    log('Nada que hacer: las cuatro categorías ya tienen guía.');
    return;
  }

  const inserted = await client
    .from('size_guides')
    .insert(missing.map((category) => ({ category, content: guides[category] })));
  if (inserted.error) fail(`No se pudieron insertar las guías: ${inserted.error.message}`);
  for (const category of missing) log(`+ ${category}: guía de ejemplo insertada.`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
