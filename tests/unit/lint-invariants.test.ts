// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// SPEC-001 Enmienda 11 / CA-56 (T-029): ESLint tiene que rechazar los tres patrones que prohíbe la
// invariante I2 (`any`, `@ts-ignore` y `as unknown as`) y no marcar código correcto. Se ejecuta
// ESLint con la configuración real del proyecto sobre fragmentos de texto, no sobre archivos reales.

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code: string, file = 'src/lint-fixture.ts'): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(process.cwd(), file) });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'sin-regla');
}

describe('invariante I2 en el lint (CA-56)', () => {
  it('rechaza `any` explícito', async () => {
    expect(await ruleIds('export const value: any = 1;\n')).toContain('@typescript-eslint/no-explicit-any');
  });

  it('rechaza `@ts-ignore`', async () => {
    const code = '// @ts-ignore\nexport const value: number = "no";\n';
    expect(await ruleIds(code)).toContain('@typescript-eslint/ban-ts-comment');
  });

  it('rechaza `as unknown as`', async () => {
    const code = 'export const value = { a: 1 } as unknown as string;\n';
    expect(await ruleIds(code)).toContain('no-restricted-syntax');
  });

  it('rechaza `as unknown as` también con un tipo compuesto y dentro de una expresión', async () => {
    const code = 'export const read = () => (window as unknown as { marca?: boolean }).marca;\n';
    expect(await ruleIds(code)).toContain('no-restricted-syntax');
  });

  it('rechaza `as unknown as` en los tests y en los scripts, no solo en src/', async () => {
    const code = 'export const value = 1 as unknown as string;\n';
    expect(await ruleIds(code, 'tests/lint-fixture.spec.ts')).toContain('no-restricted-syntax');
    expect(await ruleIds(code, 'scripts/lint-fixture.ts')).toContain('no-restricted-syntax');
  });

  it('no marca una aserción simple ni `as unknown` a secas', async () => {
    expect(await ruleIds('export const a = "x" as string;\n')).toEqual([]);
    expect(await ruleIds('export const b = "x" as unknown;\n')).toEqual([]);
  });

  it('no marca código correcto', async () => {
    const code = 'export function sum(a: number, b: number): number {\n  return a + b;\n}\n';
    expect(await ruleIds(code)).toEqual([]);
  });
});
