import type { OrderStatus } from './orders';

/**
 * Máquina de estados del pedido (SPEC-001, sección 7; CA-17). Cada transición dice quién puede
 * hacerla: `sistema` es el webhook de Stripe o la caducidad de la reserva; `admin`, el panel.
 * Cualquier otra combinación se rechaza. `entregado` y `cancelado` son estados finales.
 */

export type TransitionActor = 'admin' | 'sistema';

interface Transition {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly actors: readonly TransitionActor[];
}

export const ORDER_TRANSITIONS: readonly Transition[] = [
  { from: 'pendiente', to: 'pagado', actors: ['sistema'] },
  { from: 'pendiente', to: 'cancelado', actors: ['sistema'] },
  { from: 'pagado', to: 'preparado', actors: ['admin'] },
  { from: 'pagado', to: 'cancelado', actors: ['admin'] },
  { from: 'preparado', to: 'enviado', actors: ['admin'] },
  { from: 'enviado', to: 'entregado', actors: ['admin'] },
];

export function canTransition(from: OrderStatus, to: OrderStatus, actor: TransitionActor): boolean {
  return ORDER_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to && transition.actors.includes(actor),
  );
}

/** Estados a los que el admin puede llevar un pedido desde `from`, en el orden de la máquina. */
export function adminNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS.filter(
    (transition) => transition.from === from && transition.actors.includes('admin'),
  ).map((transition) => transition.to);
}

export function isFinalStatus(status: OrderStatus): boolean {
  return !ORDER_TRANSITIONS.some((transition) => transition.from === status);
}
