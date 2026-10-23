import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
const usaProd = !process.env.E2E_DEV;

/** Specs que crean productos visibles en el catálogo de la tienda. */
const CATALOG_WRITERS = /admin-products\.spec\.ts$/;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // Las pruebas con sesión van a la BD en la nube y a un servidor de desarrollo compartido por todos los
  // trabajadores: con la suite entera en paralelo, 5 s se queda corto en alguna navegación.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : 3,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // El modal promocional de la portada (T-089) sale a los 3 s y taparía al resto de tests: parten de `promo_seen` ya guardado.
    // `promo-modal.spec.ts` vacía este estado.
    storageState: { cookies: [], origins: [{ origin: BASE_URL, localStorage: [{ name: 'promo_seen', value: '1' }] }] },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Los tests que dan de alta productos activos en el catálogo (el panel admin) se ejecutan al final, en su propio
  // proyecto: mientras existen, los demás tests de la tienda verían productos que no esperan (orden por precio,
  // filtros de ocasión…).
  projects: [
    {
      name: 'chromium',
      testIgnore: CATALOG_WRITERS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testIgnore: CATALOG_WRITERS,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'catalog-writers',
      testMatch: CATALOG_WRITERS,
      dependencies: ['chromium', 'mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: usaProd ? `pnpm run build && pnpm run start -p ${PORT}` : `pnpm run dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !usaProd && !isCI,
    timeout: usaProd ? 180_000 : 120_000,
    // El modal promocional (T-089) está apagado por defecto; las pruebas lo encienden. Se aplica al build y al servidor que arranca esta orden.
    env: { NEXT_PUBLIC_PROMO_ENABLED: 'true' },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
