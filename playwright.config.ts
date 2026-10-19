import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
const usaProd = !process.env.E2E_DEV;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // Las pruebas con sesión van a la BD en la nube y a un servidor de desarrollo compartido por todos los
  // trabajadores: con la suite entera en paralelo, 5 s se queda corto en alguna navegación.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: usaProd ? `pnpm run build && pnpm run start -p ${PORT}` : `pnpm run dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !usaProd && !isCI,
    timeout: usaProd ? 180_000 : 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
