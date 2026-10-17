'use client';

import { useActionState, useState } from 'react';
import { initialFormState } from '@/lib/auth/form-state';
import { changeOrderStatusAction } from '@/lib/admin/actions';
import type { OrderStatus } from '@/lib/orders/orders';

const primary =
  'inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:opacity-70 md:min-h-(--control-height)';
const secondary =
  'inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft disabled:opacity-70 md:min-h-(--control-height)';

const ACTION_LABEL: Readonly<Record<OrderStatus, string>> = {
  pendiente: 'Marcar como pendiente',
  pagado: 'Marcar como pagado',
  preparado: 'Marcar como preparado',
  enviado: 'Marcar como enviado',
  entregado: 'Marcar como entregado',
  cancelado: 'Cancelar pedido',
};

/**
 * Cambio de estado del pedido (RF-10). Solo ofrece las transiciones que la máquina de estados permite al
 * admin; el servidor las vuelve a validar (CA-17). Cancelar pide una confirmación en el mismo sitio.
 * Del formulario solo se leen `orderId` y `to`.
 */
export function OrderStatusForm({
  orderId,
  next,
}: {
  readonly orderId: string;
  readonly next: readonly OrderStatus[];
}) {
  const [state, action, pending] = useActionState(changeOrderStatusAction, initialFormState);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (next.length === 0) {
    return (
      <div aria-live="polite">
        {state.status !== 'idle' && state.message ? (
          <p role={state.status === 'error' ? 'alert' : 'status'} className="text-sm font-medium">
            {state.message}
          </p>
        ) : (
          <p className="text-sm text-fg-muted">No hay cambios de estado disponibles para este pedido.</p>
        )}
      </div>
    );
  }

  const [main, ...rest] = next;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap items-center gap-2">
        {main && main !== 'cancelado' ? (
          <button type="submit" name="to" value={main} disabled={pending} className={primary}>
            {ACTION_LABEL[main]}
          </button>
        ) : null}
        {[...(main === 'cancelado' ? [main] : []), ...rest].map((status) =>
          status === 'cancelado' ? (
            confirmingCancel ? (
              <span key={status} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-danger">¿Cancelar este pedido? No se reembolsa desde la app.</span>
                <button type="submit" name="to" value={status} disabled={pending} className={secondary}>
                  Sí, cancelar pedido
                </button>
                <button type="button" onClick={() => setConfirmingCancel(false)} className={secondary}>
                  Volver
                </button>
              </span>
            ) : (
              <button key={status} type="button" onClick={() => setConfirmingCancel(true)} className={secondary}>
                {ACTION_LABEL[status]}
              </button>
            )
          ) : (
            <button key={status} type="submit" name="to" value={status} disabled={pending} className={secondary}>
              {ACTION_LABEL[status]}
            </button>
          ),
        )}
      </div>
      <div aria-live="polite">
        {state.status !== 'idle' && state.message ? (
          <p
            role={state.status === 'error' ? 'alert' : 'status'}
            className={`text-sm font-medium ${state.status === 'error' ? 'text-danger' : 'text-success'}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
