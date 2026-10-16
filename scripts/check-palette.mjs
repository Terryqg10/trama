#!/usr/bin/env node
// check-palette.mjs — Valida palette.css según design/palette-rules.md

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { contrastRatio } from './lib/contrast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PALETTE = path.join(ROOT, 'palette.css');

function log(m)   { process.stdout.write(`[check-palette] ${m}\n`); }
function warn(m)  { process.stdout.write(`[check-palette] ! ${m}\n`); }
function error(m) { process.stderr.write(`[check-palette] x ${m}\n`); }

const REQUIRED_TOKENS = [
  '--color-bg', '--color-surface', '--color-surface-muted', '--color-border',
  '--color-border-strong', '--color-fg', '--color-fg-muted',
  '--color-accent', '--color-accent-hover', '--color-accent-fg',
  '--color-accent-soft', '--color-accent-text', '--color-danger', '--color-success',
];

const PAIRS = [
  { id: 'P01', fg: '--color-fg',            bg: '--color-bg',            min: 4.5, use: 'Texto principal' },
  { id: 'P02', fg: '--color-fg',            bg: '--color-surface',       min: 4.5, use: 'Texto principal' },
  { id: 'P03', fg: '--color-fg',            bg: '--color-surface-muted', min: 4.5, use: 'Texto principal' },
  { id: 'P04', fg: '--color-fg-muted',      bg: '--color-bg',            min: 4.5, use: 'Texto secundario' },
  { id: 'P05', fg: '--color-fg-muted',      bg: '--color-surface',       min: 4.5, use: 'Texto secundario' },
  { id: 'P06', fg: '--color-fg-muted',      bg: '--color-surface-muted', min: 4.5, use: 'Texto secundario' },
  { id: 'P07', fg: '--color-accent-fg',     bg: '--color-accent',        min: 4.5, use: 'Texto del CTA' },
  { id: 'P08', fg: '--color-accent-fg',     bg: '--color-accent-hover',  min: 4.5, use: 'CTA en hover' },
  { id: 'P09', fg: '--color-accent-text',   bg: '--color-bg',            min: 4.5, use: 'Acento como texto' },
  { id: 'P10', fg: '--color-accent-text',   bg: '--color-surface',       min: 4.5, use: 'Acento como texto' },
  { id: 'P11', fg: '--color-accent-text',   bg: '--color-surface-muted', min: 4.5, use: 'Acento como texto' },
  { id: 'P12', fg: '--color-accent-text',   bg: '--color-accent-soft',   min: 4.5, use: 'Chip suave' },
  { id: 'P13', fg: '--color-fg',            bg: '--color-accent-soft',   min: 4.5, use: 'Chip suave' },
  { id: 'P14', fg: '--color-border-strong', bg: '--color-bg',            min: 3.0, use: 'Borde de control (UI)' },
  { id: 'P15', fg: '--color-border-strong', bg: '--color-surface',       min: 3.0, use: 'Borde de control (UI)' },
  { id: 'P16', fg: '--color-accent',        bg: '--color-bg',            min: 3.0, use: 'Acento como UI' },
  { id: 'P17', fg: '--color-danger',        bg: '--color-surface',       min: 4.5, use: 'Texto de error' },
  { id: 'P18', fg: '--color-success',       bg: '--color-surface',       min: 4.5, use: 'Texto de éxito' },
  { id: 'P19', fg: '--color-accent-fg',     bg: '--color-danger',        min: 4.5, use: 'Badge de error' },
  { id: 'P20', fg: '--color-accent-fg',     bg: '--color-success',       min: 4.5, use: 'Badge de éxito' },
];

async function readPalette() {
  try {
    return await fs.readFile(PALETTE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      error(`no existe ${path.relative(ROOT, PALETTE)}`);
      error('Copia design/styles/<estilo>/palette.template.css y rellénalo.');
      process.exit(1);
    }
    throw err;
  }
}

function parseHeader(css) {
  const m = css.match(/\/\*([\s\S]*?)\*\//);
  if (!m) return {};
  const header = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s*([a-z_]+)\s*:\s*(.+?)\s*$/i);
    if (mm) header[mm[1].toLowerCase()] = mm[2];
  }
  return header;
}

function parseTokens(css) {
  const tokens = {};
  const duplicates = [];
  const re = /(--color-[a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const value = m[2].toLowerCase();
    if (tokens[name]) duplicates.push(name);
    tokens[name] = value;
  }
  return { tokens, duplicates };
}

function checkHeader(header) {
  const required = ['source', 'mode', 'seed', 'rationale', 'approved_by', 'generated'];
  const missing = required.filter((k) => !header[k]);
  if (missing.length > 0) {
    error(`faltan en la cabecera: ${missing.join(', ')}`);
    return false;
  }
  const todos = Object.entries(header).filter(([, v]) => v === 'TODO');
  if (todos.length > 0) {
    error(`cabecera con TODO: ${todos.map(([k]) => k).join(', ')}`);
    return false;
  }
  if (!['claro', 'oscuro'].includes(header.mode)) {
    error(`mode debe ser "claro" u "oscuro", es "${header.mode}"`);
    return false;
  }
  if (header.approved_by !== 'user' && header.approved_by !== 'pending') {
    warn(`approved_by="${header.approved_by}" no es "user" ni "pending"`);
  }
  return true;
}

function checkTokens({ tokens, duplicates }) {
  if (duplicates.length > 0) {
    error(`tokens duplicados: ${[...new Set(duplicates)].join(', ')}`);
    return false;
  }
  const missing = REQUIRED_TOKENS.filter((t) => !tokens[t]);
  if (missing.length > 0) {
    error(`faltan tokens: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

function checkPairs(tokens) {
  log(`Comprobando ${PAIRS.length} pares WCAG:`);
  let fails = 0;
  for (const { id, fg, bg, min, use } of PAIRS) {
    const fgV = tokens[fg];
    const bgV = tokens[bg];
    if (!fgV || !bgV) {
      error(`${id}: falta ${fg} o ${bg}`);
      fails++;
      continue;
    }
    let ratio;
    try {
      ratio = contrastRatio(fgV, bgV);
    } catch (err) {
      error(`${id}: ${err.message}`);
      fails++;
      continue;
    }
    const ok = ratio >= min;
    const line = `${id} ${fg}/${bg} = ${ratio.toFixed(2)}:1 (min ${min}) — ${use}`;
    if (ok) log(`ok ${line}`);
    else { error(`x ${line}`); fails++; }
  }
  return fails === 0;
}

async function main() {
  const css = await readPalette();
  const header = parseHeader(css);
  const parsed = parseTokens(css);

  let ok = true;
  if (!checkHeader(header)) ok = false;
  if (!checkTokens(parsed)) ok = false;
  if (ok && !checkPairs(parsed.tokens)) ok = false;

  process.stdout.write('\n');
  if (ok) {
    log(`OK: ${REQUIRED_TOKENS.length} tokens, ${PAIRS.length} pares.`);
    process.exit(0);
  }
  error('Fallo. Revisa design/palette-rules.md y design/styles/<estilo>/a11y.md.');
  process.exit(1);
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
