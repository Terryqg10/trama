import { maxQty, summarize, type CartTotals, type SavedCart } from '@/lib/cart/cart';
import type { CartLineInfo } from '@/lib/cart/lines';

/**
 * Resumen del pedido calculado con los datos de la BD (RF-06, CA-09, CA-10). Recibe el carrito de la
 * cuenta (variante y cantidad) y la información actual de cada variante; el precio nunca viene del
 * navegador. Si alguna línea no se puede comprar tal cual, el checkout se bloquea y se dice cuál.
 */

export interface CheckoutLine {
  readonly variantId: string;
  readonly productName: string;
  readonly size: string;
  readonly color: string;
  readonly qty: number;
  readonly unitPriceCents: number;
}

export type CheckoutIssue =
  | { readonly kind: 'unavailable'; readonly variantId: string }
  | { readonly kind: 'soldOut'; readonly variantId: string; readonly name: string }
  | {
      readonly kind: 'insufficientStock';
      readonly variantId: string;
      readonly name: string;
      readonly requested: number;
      readonly available: number;
    };

export interface CheckoutSummary {
  readonly lines: readonly CheckoutLine[];
  readonly issues: readonly CheckoutIssue[];
  readonly totals: CartTotals;
}

function lineName(info: CartLineInfo): string {
  return `${info.productName}, talla ${info.size}, color ${info.color}`;
}

export function buildCheckoutSummary(cart: SavedCart, infos: readonly CartLineInfo[]): CheckoutSummary {
  const byId = new Map(infos.map((info) => [info.variantId, info]));
  const lines: CheckoutLine[] = [];
  const issues: CheckoutIssue[] = [];

  for (const saved of cart) {
    const info = byId.get(saved.variantId);
    if (!info) {
      issues.push({ kind: 'unavailable', variantId: saved.variantId });
      continue;
    }
    if (info.stock === 0) {
      issues.push({ kind: 'soldOut', variantId: saved.variantId, name: lineName(info) });
      continue;
    }
    const available = maxQty(info.stock);
    if (saved.qty > available) {
      issues.push({
        kind: 'insufficientStock',
        variantId: saved.variantId,
        name: lineName(info),
        requested: saved.qty,
        available,
      });
      continue;
    }
    lines.push({
      variantId: saved.variantId,
      productName: info.productName,
      size: info.size,
      color: info.color,
      qty: saved.qty,
      unitPriceCents: info.priceCents,
    });
  }

  return {
    lines,
    issues,
    totals: summarize(lines.map((line) => ({ priceCents: line.unitPriceCents, qty: line.qty }))),
  };
}

/** Texto para el cliente de cada problema del carrito (se bloquea el pago y se ofrece ajustar). */
export function describeIssue(issue: CheckoutIssue): string {
  switch (issue.kind) {
    case 'unavailable':
      return 'Hay una prenda de tu carrito que ya no está disponible. Quítala del carrito para continuar.';
    case 'soldOut':
      return `${issue.name} está agotada. Quítala del carrito para continuar.`;
    case 'insufficientStock':
      return `De ${issue.name} solo quedan ${issue.available} unidades y tienes ${issue.requested} en el carrito. Ajusta la cantidad para continuar.`;
  }
}
