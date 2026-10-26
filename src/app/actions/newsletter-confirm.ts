'use server';

import { redirect } from 'next/navigation';
import { confirmSubscription } from '@/lib/newsletter/subscribe';

/**
 * Confirma la alta de la newsletter con el token del enlace (CA-103, T-061). Es un envío de formulario, no un GET: abrir el
 * enlace (un antivirus, una vista previa) no confirma nada. El token se valida con Zod dentro de `confirmSubscription`.
 * Devuelve a la misma página con el resultado.
 */
export async function confirmNewsletterAction(formData: FormData): Promise<void> {
  const result = await confirmSubscription(formData.get('token'));
  redirect(`/newsletter/confirmar?resultado=${result}`);
}
