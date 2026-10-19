// Lógica de optimize-images: convierte originales (public/images/raw/) a AVIF y WebP.
// Separada del CLI (scripts/optimize-images.mjs) para poder probarla (CA-70).

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Lado largo máximo en píxeles. Nunca se amplía. */
export const MAX_SIDE = 2000;
export const QUALITY = { avif: 60, webp: 80 };
export const INPUT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class OptimizeError extends Error {}

/** Los archivos `hero-*` van a hero/; el resto, a products/. */
export function outputGroup(baseName) {
  return baseName.startsWith('hero-') ? 'hero' : 'products';
}

async function listOriginals(rawDir) {
  let entries;
  try {
    entries = await fs.readdir(rawDir, { withFileTypes: true });
  } catch {
    throw new OptimizeError(`No existe la carpeta de originales: ${rawDir}`);
  }
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  if (files.length === 0) {
    throw new OptimizeError(`No hay originales en ${rawDir}. Copia ahí las fotos (jpg, png o webp).`);
  }
  for (const file of files) {
    const { name, ext } = path.parse(file);
    if (!INPUT_EXTENSIONS.includes(ext.toLowerCase())) {
      throw new OptimizeError(`Formato no admitido: ${file}. Usa ${INPUT_EXTENSIONS.join(', ')}.`);
    }
    if (!KEBAB.test(name)) {
      throw new OptimizeError(`Nombre no válido: ${file}. Usa kebab-case en minúsculas (p. ej. camisa-oxford-blanca.jpg).`);
    }
  }
  return files;
}

async function isUpToDate(source, outputs) {
  try {
    const src = await fs.stat(source);
    const stats = await Promise.all(outputs.map((o) => fs.stat(o)));
    return stats.every((s) => s.mtimeMs >= src.mtimeMs);
  } catch {
    return false;
  }
}

/**
 * Optimiza todos los originales de `rawDir` y escribe en `<outRoot>/<grupo>/`.
 * No modifica `rawDir`. Devuelve una entrada por original.
 */
export async function optimizeImages({ rawDir, outRoot }) {
  const files = await listOriginals(rawDir);
  const results = [];
  for (const file of files) {
    const source = path.join(rawDir, file);
    const { name } = path.parse(file);
    const dir = path.join(outRoot, outputGroup(name));
    const targets = { avif: path.join(dir, `${name}.avif`), webp: path.join(dir, `${name}.webp`) };
    const originalBytes = (await fs.stat(source)).size;

    if (await isUpToDate(source, Object.values(targets))) {
      const sizes = {};
      for (const [fmt, target] of Object.entries(targets)) sizes[fmt] = (await fs.stat(target)).size;
      results.push({ file, group: outputGroup(name), skipped: true, originalBytes, bytes: sizes });
      continue;
    }

    let pipeline;
    try {
      pipeline = sharp(source).rotate().resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      });
      await pipeline.clone().metadata();
    } catch {
      throw new OptimizeError(`No se pudo leer la imagen: ${file}`);
    }

    await fs.mkdir(dir, { recursive: true });
    const bytes = {};
    let width = 0;
    let height = 0;
    for (const [fmt, target] of Object.entries(targets)) {
      const info = await pipeline.clone().toFormat(fmt, { quality: QUALITY[fmt] }).toFile(target);
      bytes[fmt] = info.size;
      width = info.width;
      height = info.height;
    }
    results.push({ file, group: outputGroup(name), skipped: false, originalBytes, bytes, width, height });
  }
  return results;
}
