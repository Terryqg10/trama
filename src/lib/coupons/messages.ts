/** Por qué no se puede usar un código en el pago (RF-27, CA-137, T-093). */
export type CouponFailure = 'unknown' | 'expired' | 'redeemed' | 'notFirstPurchase' | 'inUse';

const MESSAGES: Readonly<Record<CouponFailure, string>> = {
  unknown: 'Ese código no existe. Revisa que esté bien escrito.',
  expired: 'Ese código ha caducado.',
  redeemed: 'Ese código ya se ha usado.',
  notFirstPurchase: 'El código de bienvenida solo vale para tu primera compra.',
  inUse: 'Ese código se está usando en otro pago. Inténtalo de nuevo en unos minutos.',
};

export function describeCouponFailure(reason: CouponFailure): string {
  return MESSAGES[reason];
}
