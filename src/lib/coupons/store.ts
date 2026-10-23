import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { couponCodeSchema, generateCouponCode } from './code';
import type { CouponFailure } from './messages';

/**
 * Acceso al cupón de bienvenida (RF-27, CA-135, CA-137, CA-139, T-093, Enmienda 41). Solo se usa con el cliente de servicio:
 * `welcome_coupons` no admite ningún acceso con la clave pública ni con una sesión (CA-134). Cada fila leída se valida con Zod.
 * Los errores de base de datos se lanzan; el llamador decide cómo fallar. Nada de esto registra emails.
 */

const UNIQUE_VIOLATION = '23505';
const MAX_ISSUE_ATTEMPTS = 5;
const COLUMNS = 'id, code, email, percent_off, expires_at, redeemed_at';

/** Estados de un pedido que cuentan como compra hecha: el cupón de bienvenida solo vale para la primera. */
const PAID_STATUSES = ['pagado', 'preparado', 'enviado', 'entregado'] as const;

const couponRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  email: z.string(),
  percent_off: z.number().int(),
  expires_at: z.string(),
  redeemed_at: z.string().nullable(),
});
type CouponRow = z.infer<typeof couponRowSchema>;

export type CouponState = 'valid' | 'redeemed' | 'expired';

/** Un cupón canjeado manda sobre uno caducado: si ya se usó, da igual cuándo caducaba. */
export function classifyCoupon(row: Pick<CouponRow, 'expires_at' | 'redeemed_at'>, now: number): CouponState {
  if (row.redeemed_at !== null) return 'redeemed';
  return Date.parse(row.expires_at) <= now ? 'expired' : 'valid';
}

export type IssueResult =
  | { readonly status: 'issued' | 'existing'; readonly code: string; readonly expiresAt: string; readonly percentOff: number }
  | { readonly status: 'redeemed' | 'expired' | 'error' };

function fromExisting(row: CouponRow, now: number): IssueResult {
  const state = classifyCoupon(row, now);
  if (state !== 'valid') return { status: state };
  return { status: 'existing', code: row.code, expiresAt: row.expires_at, percentOff: row.percent_off };
}

async function findByEmail(client: SupabaseClient, email: string): Promise<CouponRow | null> {
  const found = await client.from('welcome_coupons').select(COLUMNS).eq('email', email).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  return found.data ? couponRowSchema.parse(found.data) : null;
}

/**
 * Crea el código de un email o recupera el suyo (CA-135): el mismo email recibe el mismo código mientras sea válido; si
 * caducó o se canjeó, se dice y NO se genera otro. Dos altas a la vez con el mismo email acaban con el mismo código.
 */
export async function issueWelcomeCoupon(
  client: SupabaseClient,
  email: string,
  now: number = Date.now(),
  generate: () => string = generateCouponCode,
): Promise<IssueResult> {
  try {
    const existing = await findByEmail(client, email);
    if (existing) return fromExisting(existing, now);

    for (let attempt = 0; attempt < MAX_ISSUE_ATTEMPTS; attempt += 1) {
      const inserted = await client.from('welcome_coupons').insert({ code: generate(), email }).select(COLUMNS).single();
      if (!inserted.error) {
        const row = couponRowSchema.parse(inserted.data);
        return { status: 'issued', code: row.code, expiresAt: row.expires_at, percentOff: row.percent_off };
      }
      if (inserted.error.code !== UNIQUE_VIOLATION) throw new Error(inserted.error.message);
      // 23505: otro alta del mismo email se adelantó, o el código salió repetido. Si el email ya tiene cupón, es lo primero.
      const raced = await findByEmail(client, email);
      if (raced) return fromExisting(raced, now);
    }
    return { status: 'error' };
  } catch (error) {
    console.error('issueWelcomeCoupon falló', error instanceof Error ? error.message : 'error desconocido');
    return { status: 'error' };
  }
}

export type CouponCheck =
  | { readonly ok: true; readonly coupon: { readonly id: string; readonly code: string; readonly percentOff: number } }
  | { readonly ok: false; readonly reason: CouponFailure };

/**
 * Valida un código para un cliente en el pago (CA-137): formato, que exista, que no se haya canjeado ni caducado y que el
 * cliente no tenga ya ningún pedido pagado. El código llega del navegador como texto; todo lo demás sale de la BD.
 */
export async function checkCouponForUser(
  client: SupabaseClient,
  userId: string,
  rawCode: string,
  now: number = Date.now(),
): Promise<CouponCheck> {
  const parsed = couponCodeSchema.safeParse(rawCode);
  if (!parsed.success) return { ok: false, reason: 'unknown' };

  const found = await client.from('welcome_coupons').select(COLUMNS).eq('code', parsed.data).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) return { ok: false, reason: 'unknown' };
  const row = couponRowSchema.parse(found.data);

  const state = classifyCoupon(row, now);
  if (state !== 'valid') return { ok: false, reason: state };

  const paid = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', [...PAID_STATUSES]);
  if (paid.error) throw new Error(paid.error.message);
  if ((paid.count ?? 0) > 0) return { ok: false, reason: 'notFirstPurchase' };

  return { ok: true, coupon: { id: row.id, code: row.code, percentOff: row.percent_off } };
}

const orderCouponSchema = z.object({ coupon_id: z.string().nullable() });

/**
 * Canjea el cupón de un pedido ya pagado (CA-139). Idempotente: solo actualiza si el cupón sigue sin canjear, así que un
 * evento repetido no lo vuelve a tocar. Un pedido pendiente o cancelado no consume nada: se exige un estado de pagado.
 * Devuelve `true` si este llamado lo canjeó.
 */
export async function redeemCouponForOrder(
  client: SupabaseClient,
  orderId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const order = await client
    .from('orders')
    .select('coupon_id')
    .eq('id', orderId)
    .in('status', [...PAID_STATUSES])
    .maybeSingle();
  if (order.error) throw new Error(order.error.message);
  const couponId = order.data ? orderCouponSchema.parse(order.data).coupon_id : null;
  if (!couponId) return false;

  const updated = await client
    .from('welcome_coupons')
    .update({ redeemed_at: new Date(now).toISOString(), redeemed_order_id: orderId })
    .eq('id', couponId)
    .is('redeemed_at', null)
    .select('id');
  if (updated.error) throw new Error(updated.error.message);
  return (updated.data ?? []).length > 0;
}
