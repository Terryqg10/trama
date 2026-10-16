import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests de integración contra la BD real (ADR-002). Se ejecutan aparte de
// `pnpm test` porque necesitan red y variables de entorno de Supabase.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Los tests comparten la misma BD: se ejecutan en serie.
    fileParallelism: false,
  },
}));
