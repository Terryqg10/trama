import type { FormState } from '@/lib/auth/form-state';

/**
 * Lo que el servidor cuenta del cupón de bienvenida tras suscribirse (RF-27, CA-135, T-093). Con un cupón válido lleva el
 * código y su caducidad; si el email ya tenía uno caducado o canjeado, solo el motivo (no se genera otro).
 */
export type CouponNotice =
  | { readonly status: 'issued' | 'existing'; readonly code: string; readonly expiresAt: string }
  | { readonly status: 'expired' | 'redeemed' };

/** Estado del formulario de la newsletter: el genérico de las acciones de formulario más el cupón, si lo hay. */
export type NewsletterState = FormState & { readonly coupon?: CouponNotice };

export const initialNewsletterState: NewsletterState = { status: 'idle' };
