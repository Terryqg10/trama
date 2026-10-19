// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_SIDE, OptimizeError, optimizeImages, outputGroup } from '../../scripts/lib/optimize-images.mjs';

// CA-70: optimize-images (los originales no se tocan, repetible, errores claros).

// En Windows sharp mantiene los archivos abiertos con su caché y impide borrar el directorio temporal.
sharp.cache(false);

let tmp: string;
let rawDir: string;
let outRoot: string;

async function makeJpeg(name: string, width: number, height: number): Promise<string> {
  const file = path.join(rawDir, name);
  await sharp({ create: { width, height, channels: 3, background: { r: 120, g: 130, b: 140 } } })
    .jpeg()
    .toFile(file);
  return file;
}

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'optimize-images-'));
  rawDir = path.join(tmp, 'raw');
  outRoot = path.join(tmp, 'out');
  await fs.mkdir(rawDir);
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('outputGroup', () => {
  it('manda hero-* a hero y el resto a products', () => {
    expect(outputGroup('hero-pareja-vertical')).toBe('hero');
    expect(outputGroup('camisa-oxford-blanca')).toBe('products');
  });
});

describe('optimizeImages (CA-70)', () => {
  it('genera AVIF y WebP con el lado largo limitado y sin ampliar', async () => {
    await makeJpeg('camisa-oxford-blanca.jpg', 3000, 4000);
    await makeJpeg('polo-pequeno.jpg', 400, 300);
    const results = await optimizeImages({ rawDir, outRoot });

    expect(results.map((r) => r.file)).toEqual(['camisa-oxford-blanca.jpg', 'polo-pequeno.jpg']);
    for (const name of ['camisa-oxford-blanca', 'polo-pequeno']) {
      for (const ext of ['avif', 'webp']) {
        await expect(fs.stat(path.join(outRoot, 'products', `${name}.${ext}`))).resolves.toBeTruthy();
      }
    }
    const big = await sharp(path.join(outRoot, 'products', 'camisa-oxford-blanca.webp')).metadata();
    expect(Math.max(big.width ?? 0, big.height ?? 0)).toBe(MAX_SIDE);
    const small = await sharp(path.join(outRoot, 'products', 'polo-pequeno.webp')).metadata();
    expect([small.width, small.height]).toEqual([400, 300]);
  });

  it('escribe los hero-* en hero/', async () => {
    await makeJpeg('hero-pareja-horizontal.jpg', 1200, 600);
    await optimizeImages({ rawDir, outRoot });
    await expect(fs.stat(path.join(outRoot, 'hero', 'hero-pareja-horizontal.avif'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(outRoot, 'products', 'hero-pareja-horizontal.avif'))).rejects.toThrow();
  });

  it('no modifica los originales', async () => {
    const file = await makeJpeg('camisa-oxford-blanca.jpg', 2500, 2500);
    const before = await fs.readFile(file);
    await optimizeImages({ rawDir, outRoot });
    expect((await fs.readFile(file)).equals(before)).toBe(true);
    expect(await fs.readdir(rawDir)).toEqual(['camisa-oxford-blanca.jpg']);
  });

  it('es repetible: la segunda pasada omite lo que no ha cambiado', async () => {
    await makeJpeg('camisa-oxford-blanca.jpg', 800, 800);
    const first = await optimizeImages({ rawDir, outRoot });
    const second = await optimizeImages({ rawDir, outRoot });
    expect(first[0]?.skipped).toBe(false);
    expect(second[0]?.skipped).toBe(true);
    expect(second[0]?.bytes).toEqual(first[0]?.bytes);
  });

  it('falla con un mensaje claro si la carpeta no existe o está vacía', async () => {
    await expect(optimizeImages({ rawDir: path.join(tmp, 'no-existe'), outRoot })).rejects.toThrow(/No existe la carpeta/);
    await expect(optimizeImages({ rawDir, outRoot })).rejects.toThrow(/No hay originales/);
    await expect(optimizeImages({ rawDir, outRoot })).rejects.toBeInstanceOf(OptimizeError);
  });

  it('rechaza nombres que no son kebab-case y formatos no admitidos, sin escribir nada', async () => {
    await makeJpeg('Camisa Oxford.jpg', 100, 100);
    await expect(optimizeImages({ rawDir, outRoot })).rejects.toThrow(/Nombre no válido/);
    await fs.rm(path.join(rawDir, 'Camisa Oxford.jpg'));
    await fs.writeFile(path.join(rawDir, 'notas.txt'), 'x');
    await expect(optimizeImages({ rawDir, outRoot })).rejects.toThrow(/Formato no admitido/);
    await expect(fs.stat(outRoot)).rejects.toThrow();
  });

  it('falla con un archivo que no es una imagen válida', async () => {
    await fs.writeFile(path.join(rawDir, 'camisa-rota.jpg'), 'no soy una imagen');
    await expect(optimizeImages({ rawDir, outRoot })).rejects.toThrow(/No se pudo leer la imagen: camisa-rota\.jpg/);
  });
});
