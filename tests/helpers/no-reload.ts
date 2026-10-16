import { expect, type Page } from '@playwright/test';

// Comprobar que una acción NO recarga el documento (navegación blanda, abrir y cerrar paneles…).
//
// Se marca el elemento `<html>` con un atributo de `dataset`, que está tipado por el DOM y no
// necesita ningún cast. Una recarga crea un documento nuevo y borra la marca; una navegación
// blanda conserva el mismo documento y la marca sigue ahí.

const MARK = 'sinRecarga';

/** Marca el documento actual. Hay que llamarla después de cargar la página y antes de actuar. */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate((name) => {
    document.documentElement.dataset[name] = 'true';
  }, MARK);
}

/** Comprueba que el documento sigue siendo el marcado: no ha habido recarga. */
export async function expectNoReload(page: Page): Promise<void> {
  const mark = await page.evaluate((name) => document.documentElement.dataset[name], MARK);
  expect(mark, 'el documento no se ha recargado').toBe('true');
}
