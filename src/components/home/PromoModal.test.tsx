import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CA-127 a CA-131 (T-089, nivel de componente). El envío real, la hidratación y la maquetación a 1280 y 375 px los comprueba el e2e `promo-modal`.

vi.mock('@/app/actions/newsletter', () => ({ subscribeAction: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { CartDrawerProvider, useCartDrawer } from '@/components/cart/CartDrawerContext';
import { PROMO_DELAY_MS, PROMO_IMAGE, PROMO_STORAGE_KEY, PromoModal } from './PromoModal';

function OpenCartButton() {
  const { openCart } = useCartDrawer();
  return (
    <button type="button" onClick={openCart}>
      abrir cesta
    </button>
  );
}

function renderPage() {
  return render(
    <CartDrawerProvider>
      <OpenCartButton />
      <PromoModal />
    </CartDrawerProvider>,
  );
}

const modal = () => screen.queryByTestId('promo-modal');
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  // Apagado por defecto (CA-132): los tests parten de encendido y los de la bandera lo cambian.
  vi.stubEnv('NEXT_PUBLIC_PROMO_ENABLED', 'true');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('PromoModal: aparición (CA-127)', () => {
  it('no está antes de 3 s y se abre a los 3 s, guardando promo_seen', async () => {
    renderPage();
    expect(modal()).toBeNull();
    await wait(PROMO_DELAY_MS - 1);
    expect(modal()).toBeNull();
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBeNull();
    await wait(1);
    expect(modal()).not.toBeNull();
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBe('1');
  });

  it('no se abre si ya estaba promo_seen', async () => {
    window.localStorage.setItem(PROMO_STORAGE_KEY, '1');
    renderPage();
    await wait(PROMO_DELAY_MS * 2);
    expect(modal()).toBeNull();
  });

  it('al volver a montarlo (otra visita) no sale de nuevo', async () => {
    const first = renderPage();
    await wait(PROMO_DELAY_MS);
    expect(modal()).not.toBeNull();
    first.unmount();
    renderPage();
    await wait(PROMO_DELAY_MS * 2);
    expect(modal()).toBeNull();
  });

  it('si localStorage no se puede leer, no se abre', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    renderPage();
    await wait(PROMO_DELAY_MS * 2);
    expect(modal()).toBeNull();
  });

  it('si localStorage no se puede escribir, se abre igualmente sin fallar', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('lleno');
    });
    renderPage();
    await wait(PROMO_DELAY_MS);
    expect(modal()).not.toBeNull();
  });

  it('no se abre con el carrito lateral abierto', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'abrir cesta' }));
    await wait(PROMO_DELAY_MS);
    expect(modal()).toBeNull();
  });

  it('si se desmonta antes de los 3 s no se abre ni guarda nada', async () => {
    const view = renderPage();
    await wait(1000);
    view.unmount();
    await wait(PROMO_DELAY_MS);
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBeNull();
  });
});

describe('PromoModal: bandera NEXT_PUBLIC_PROMO_ENABLED (CA-132)', () => {
  it.each([
    ['sin definir', undefined],
    ['vacía', ''],
    ['false', 'false'],
    ['1', '1'],
    ['TRUE', 'TRUE'],
  ])('apagado si la bandera está %s: no se abre aunque pasen 3 s ni guarda promo_seen', async (_nombre, valor) => {
    if (valor === undefined) vi.stubEnv('NEXT_PUBLIC_PROMO_ENABLED', undefined);
    else vi.stubEnv('NEXT_PUBLIC_PROMO_ENABLED', valor);
    renderPage();
    await wait(PROMO_DELAY_MS * 2);
    expect(modal()).toBeNull();
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBeNull();
  });

  it('con la bandera en «true» se abre a los 3 s', async () => {
    renderPage();
    await wait(PROMO_DELAY_MS);
    expect(modal()).not.toBeNull();
  });

  it('el botón de prueba de desarrollo funciona aunque la bandera esté apagada', () => {
    vi.stubEnv('NEXT_PUBLIC_PROMO_ENABLED', 'false');
    vi.stubEnv('NODE_ENV', 'development');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Probar promo' }));
    expect(modal()).not.toBeNull();
  });
});

describe('PromoModal: contenido (CA-129 y CA-130)', () => {
  async function opened() {
    renderPage();
    await wait(PROMO_DELAY_MS);
    return screen.getByTestId('promo-modal');
  }

  it('es un diálogo modal con nombre y descripción', async () => {
    const dialog = await opened();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Suscríbete y consigue un 10 % en tu primera compra' })).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe(within(dialog).getByRole('heading', { level: 2 }).id);
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    // Enmienda 41: sin correo propio, el código se muestra al suscribirse; el modal ya no promete ningún email.
    expect(description?.textContent).toBe('Te mostraremos tu código de descuento al suscribirte.');
    expect(description?.textContent).not.toContain('email');
  });

  it('el título es serif y la rejilla tiene 2 columnas desde 768 px', async () => {
    const dialog = await opened();
    expect(within(dialog).getByRole('heading', { level: 2 }).className).toContain('font-serif');
    expect(dialog.className).toContain('md:grid-cols-2');
  });

  it('desde 768 px la foto es decorativa y está en la columna derecha: después del texto en el DOM, solo desde esa anchura', async () => {
    const dialog = await opened();
    const column = screen.getByTestId('promo-modal-image');
    expect(column.className).toContain('hidden');
    expect(column.className).toContain('md:block');
    const image = column.querySelector('img');
    expect(image?.getAttribute('alt')).toBe('');
    expect(decodeURIComponent(image?.getAttribute('src') ?? '')).toContain(PROMO_IMAGE);
    const text = within(dialog).getByRole('heading', { level: 2 });
    expect(text.compareDocumentPosition(column) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('por debajo de 768 px la foto va arriba: antes del texto en el DOM, a ancho completo en 4:3 y solo en móvil (CA-133)', async () => {
    const dialog = await opened();
    const top = screen.getByTestId('promo-modal-image-mobile');
    expect(top.className).toContain('aspect-4/3');
    expect(top.className).toContain('md:hidden');
    expect(top.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    const image = top.querySelector('img');
    expect(image?.getAttribute('alt')).toBe('');
    expect(decodeURIComponent(image?.getAttribute('src') ?? '')).toContain(PROMO_IMAGE);
    const text = within(dialog).getByRole('heading', { level: 2 });
    expect(top.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Sin reordenar con CSS: ningún `order-*` ni `flex-row-reverse` en el diálogo (rules/ui-decisions.md).
    expect(dialog.innerHTML).not.toMatch(/\border-\d|\border-first|\border-last|row-reverse|col-reverse/);
  });

  it('tiene email, casilla de privacidad sin marcar con enlace a /privacidad y botón de suscripción', async () => {
    const dialog = await opened();
    expect(within(dialog).getByLabelText('Email')).toBeTruthy();
    expect((within(dialog).getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(within(dialog).getByRole('link', { name: 'política de privacidad' }).getAttribute('href')).toBe('/privacidad');
    expect(within(dialog).getByRole('button', { name: 'Suscribirme' })).toBeTruthy();
    expect(within(dialog).getByTestId('newsletter-message').getAttribute('aria-live')).toBe('polite');
  });
});

describe('PromoModal: cierre y accesibilidad (CA-128)', () => {
  async function opened() {
    renderPage();
    await wait(PROMO_DELAY_MS);
    return screen.getByTestId('promo-modal');
  }

  it('el foco entra en el diálogo y el body no hace scroll', async () => {
    const dialog = await opened();
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('se cierra con Esc y se recupera el scroll', async () => {
    await opened();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(modal()).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('se cierra con la X, que mide 44 px, y con un clic en el fondo; un clic dentro no lo cierra', async () => {
    const dialog = await opened();
    const close = screen.getByRole('button', { name: 'Cerrar' });
    expect(close.className).toContain('size-11');
    fireEvent.click(dialog);
    expect(modal()).not.toBeNull();
    fireEvent.click(screen.getByTestId('promo-modal-backdrop'));
    expect(modal()).toBeNull();
  });

  it('se cierra con la X', async () => {
    await opened();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(modal()).toBeNull();
  });

  it('el foco vuelve al elemento que lo tenía al abrirse', async () => {
    renderPage();
    const trigger = screen.getByRole('button', { name: 'abrir cesta' });
    // El temporizador usa el foco que haya al disparar: se le da al botón antes de los 3 s (sin abrir la cesta).
    trigger.focus();
    await wait(PROMO_DELAY_MS);
    expect(modal()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it('atrapa el foco: Tab y Mayús+Tab recorren el diálogo en orden y dan la vuelta, enlaces incluidos', async () => {
    const dialog = await opened();
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    expect(first).toBe(screen.getByRole('button', { name: 'Cerrar' }));
    expect(items.some((item) => item.tagName === 'A')).toBe(true);
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    // Con el foco fuera del diálogo (el navegador lo sacó), Tab lo devuelve dentro.
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

describe('PromoModal: botón de prueba (CA-131)', () => {
  it('no existe fuera de desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'production');
    renderPage();
    expect(screen.queryByTestId('promo-test-button')).toBeNull();
  });

  it('en desarrollo existe y abre el modal sin esperar ni guardar promo_seen', () => {
    vi.stubEnv('NODE_ENV', 'development');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Probar promo' }));
    expect(modal()).not.toBeNull();
    expect(window.localStorage.getItem(PROMO_STORAGE_KEY)).toBeNull();
  });
});
