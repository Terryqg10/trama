/**
 * Tipos para optimize-images.mjs (el runtime es JavaScript; estas declaraciones
 * permiten importarlo desde tests en TypeScript sin allowJs).
 */

export const MAX_SIDE: number;
export const QUALITY: { avif: number; webp: number };
export const INPUT_EXTENSIONS: string[];

export class OptimizeError extends Error {}

export function outputGroup(baseName: string): 'hero' | 'products';

export type OptimizeResult = {
  file: string;
  group: 'hero' | 'products';
  skipped: boolean;
  originalBytes: number;
  bytes: { avif: number; webp: number };
  width?: number;
  height?: number;
};

export function optimizeImages(options: { rawDir: string; outRoot: string }): Promise<OptimizeResult[]>;
