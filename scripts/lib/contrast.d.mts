/**
 * Tipos para contrast.mjs.
 * El runtime sigue en JavaScript (script Node); estas declaraciones
 * existen para que TypeScript pueda importarlo desde tests y desde
 * código TS sin allowJs.
 */

export function hexToRgb(hex: string): [number, number, number];
export function relativeLuminance(rgb: [number, number, number]): number;
export function contrastRatio(hexA: string, hexB: string): number;
