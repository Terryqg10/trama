import { z } from 'zod';
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from '@/lib/domain/shop';

/**
 * Lógica pura del carrito de invitado (RF-03, RF-15). Sin acceso a navegador ni a red.
 * Importes en céntimos enteros. El carrito guardado solo contiene `variantId` y `qty`:
 * precio y stock salen siempre del servidor.
 */

/** Límite de unidades por línea: el mismo CHECK que `cart_items.qty` en la BD. */
export const MAX_LINE_QTY = 99;

/** Tope defensivo de líneas distintas (el carrito guardado es un input que el usuario puede editar). */
export const MAX_CART_LINES = 50;

export const savedLineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
});
export type SavedLine = z.infer<typeof savedLineSchema>;

export const savedCartSchema = z.array(savedLineSchema).max(MAX_CART_LINES);
export type SavedCart = readonly SavedLine[];

export const EMPTY_CART: SavedCart = [];

/**
 * Lee el carrito guardado. Un valor que no es JSON o no cumple el esquema se descarta entero
 * (carrito vacío). Las líneas repetidas de una variante se suman, con el tope de la línea.
 */
export function parseSavedCart(raw: string | null): SavedCart {
  if (raw === null) return EMPTY_CART;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_CART;
  }
  const parsed = savedCartSchema.safeParse(json);
  if (!parsed.success) return EMPTY_CART;

  const merged = new Map<string, number>();
  for (const line of parsed.data) {
    merged.set(line.variantId, Math.min(MAX_LINE_QTY, (merged.get(line.variantId) ?? 0) + line.qty));
  }
  return [...merged].map(([variantId, qty]) => ({ variantId, qty }));
}

/** Cantidad máxima que se puede tener de una variante: el stock, sin pasar del tope de la línea. */
export function maxQty(stock: number): number {
  return Math.max(0, Math.min(stock, MAX_LINE_QTY));
}

export interface QtyResult {
  readonly qty: number;
  /** `true` si se pidió más de lo disponible y se ha limitado (CA-05). */
  readonly capped: boolean;
}

/** Limita una cantidad pedida al stock (CA-05). */
export function capQty(requested: number, stock: number): QtyResult {
  const limit = maxQty(stock);
  if (requested > limit) return { qty: limit, capped: true };
  return { qty: Math.max(0, requested), capped: false };
}

export interface CartChange {
  readonly cart: SavedCart;
  readonly capped: boolean;
}

/** Añade una unidad de la variante (CA-60). Si ya está, suma 1 sin pasar del stock. */
export function addToCart(cart: SavedCart, variantId: string, stock: number): CartChange {
  const current = cart.find((line) => line.variantId === variantId);
  const result = capQty((current?.qty ?? 0) + 1, stock);
  if (result.qty < 1) return { cart, capped: true };
  if (current) {
    return { cart: cart.map((line) => (line.variantId === variantId ? { ...line, qty: result.qty } : line)), capped: result.capped };
  }
  if (cart.length >= MAX_CART_LINES) return { cart, capped: false };
  return { cart: [...cart, { variantId, qty: result.qty }], capped: result.capped };
}

/** Fija la cantidad de una línea, limitada al stock. Una cantidad menor que 1 quita la línea. */
export function setLineQty(cart: SavedCart, variantId: string, requested: number, stock: number): CartChange {
  if (requested < 1) return { cart: removeLine(cart, variantId), capped: false };
  const result = capQty(requested, stock);
  if (result.qty < 1) return { cart: removeLine(cart, variantId), capped: true };
  return {
    cart: cart.map((line) => (line.variantId === variantId ? { ...line, qty: result.qty } : line)),
    capped: result.capped,
  };
}

export function removeLine(cart: SavedCart, variantId: string): SavedCart {
  return cart.filter((line) => line.variantId !== variantId);
}

/**
 * Envío (RF-15, CA-28). Se compara el subtotal de las líneas con el umbral: a partir de él el envío
 * es gratis; por debajo, tarifa plana. Un carrito sin importe no tiene envío.
 */
export function shippingFor(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

export interface CartTotals {
  readonly subtotalCents: number;
  readonly shippingCents: number;
  readonly totalCents: number;
  /** Lo que falta para el envío gratis; `0` si ya se alcanza o el carrito está vacío. */
  readonly missingForFreeCents: number;
}

export function summarize(lines: ReadonlyArray<{ readonly priceCents: number; readonly qty: number }>): CartTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0);
  const shippingCents = shippingFor(subtotalCents);
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    missingForFreeCents:
      subtotalCents > 0 && subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS
        ? FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents
        : 0,
  };
}

/**
 * Fusiona el carrito del invitado con el de la cuenta (CA-04): las líneas de la cuenta conservan su
 * orden, las nuevas del invitado van detrás, y las cantidades de una misma variante se suman con el
 * tope de la línea. Los topes de stock los aplica quien guarda (el servidor).
 */
export function mergeCarts(account: SavedCart, guest: SavedCart): SavedCart {
  const merged = new Map<string, number>();
  for (const line of [...account, ...guest]) {
    merged.set(line.variantId, Math.min(MAX_LINE_QTY, (merged.get(line.variantId) ?? 0) + line.qty));
  }
  return [...merged].slice(0, MAX_CART_LINES).map(([variantId, qty]) => ({ variantId, qty }));
}
