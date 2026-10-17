'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin';
import type { FormState } from '@/lib/auth/form-state';
import { formDataToObject } from '@/lib/auth/schemas';
import { getCurrentUser } from '@/lib/auth/session';
import { changeOrderStatus } from '@/lib/orders/admin';
import { ORDER_STATUSES, statusLabel } from '@/lib/orders/orders';

const changeStatusSchema = z.object({
  orderId: z.string().uuid(),
  to: z.enum(ORDER_STATUSES),
});

/** Cambia el estado de un pedido como admin (RF-10, CA-17). Del formulario solo se leen `orderId` y `to`. */
export async function changeOrderStatusAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = changeStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: 'error', message: 'La petición no es válida.' };

  const { client, user } = await getCurrentUser();
  if (!user) redirect('/acceso');
  if (!(await isAdmin(client, user.id))) return { status: 'error', message: 'No tienes permiso para esta acción.' };

  let result: Awaited<ReturnType<typeof changeOrderStatus>>;
  try {
    result = await changeOrderStatus(client, parsed.data.orderId, parsed.data.to);
  } catch (error) {
    console.error('changeOrderStatusAction falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error', message: 'No se ha podido cambiar el estado. Inténtalo de nuevo.' };
  }

  switch (result.status) {
    case 'ok':
      revalidatePath('/admin/pedidos');
      revalidatePath(`/admin/pedidos/${parsed.data.orderId}`);
      return { status: 'success', message: `Pedido ${statusLabel(result.to).toLowerCase()}.` };
    case 'notFound':
      return { status: 'error', message: 'Ese pedido no existe.' };
    case 'invalidTransition':
      return {
        status: 'error',
        message: `No se puede pasar un pedido de «${statusLabel(result.from)}» a «${statusLabel(result.to)}».`,
      };
    case 'conflict':
      return { status: 'error', message: 'El pedido ha cambiado mientras tanto. Recarga la página para verlo.' };
  }
}
