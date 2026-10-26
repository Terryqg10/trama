import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Acceso a `newsletter_subscribers` con la clave de servicio (CA-103, T-061, Enmienda 50): la clave pública solo puede dar
 * de alta filas sin confirmar y no lee nada (RLS). Cada fila leída se valida con Zod. Un fallo de la base de datos lanza; el
 * llamador decide cómo fallar. Nada de esto registra emails.
 */

export interface PendingSubscription {
  readonly email: string;
  readonly tokenHash: string;
  readonly expiresAt: string;
}

export interface StoredToken {
  readonly confirmedAt: string | null;
  readonly expiresAt: string | null;
}

/** Lo mínimo que necesitan el alta y la confirmación (así se prueban sin red). */
export interface NewsletterStore {
  /** Alta pendiente, o token nuevo si el email ya existía (confirmado o no): `confirmed_at` no se toca. */
  savePending(subscription: PendingSubscription): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<StoredToken | null>;
  /** Confirma la alta de ese hash y borra el token. `false` si ya no existía (otro la confirmó antes). */
  markConfirmed(tokenHash: string, at: string): Promise<boolean>;
}

const rowSchema = z.object({ confirmed_at: z.string().nullable(), confirm_expires_at: z.string().nullable() });
const idSchema = z.object({ id: z.string() });

export function createNewsletterStore(client: SupabaseClient): NewsletterStore {
  return {
    async savePending({ email, tokenHash, expiresAt }) {
      // `consent` es siempre true (sin él no hay alta). En un email que ya existe solo se renueva el token.
      const { error } = await client
        .from('newsletter_subscribers')
        .upsert({ email, consent: true, confirm_token_hash: tokenHash, confirm_expires_at: expiresAt }, { onConflict: 'email' });
      if (error) throw new Error(error.message);
    },

    async findByTokenHash(tokenHash) {
      const { data, error } = await client
        .from('newsletter_subscribers')
        .select('confirmed_at, confirm_expires_at')
        .eq('confirm_token_hash', tokenHash)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = rowSchema.parse(data);
      return { confirmedAt: row.confirmed_at, expiresAt: row.confirm_expires_at };
    },

    async markConfirmed(tokenHash, at) {
      const current = await this.findByTokenHash(tokenHash);
      if (!current) return false;
      // Un suscriptor ya confirmado conserva su fecha original; el token se gasta igualmente.
      const { data, error } = await client
        .from('newsletter_subscribers')
        .update({ confirmed_at: current.confirmedAt ?? at, confirm_token_hash: null, confirm_expires_at: null })
        .eq('confirm_token_hash', tokenHash)
        .select('id');
      if (error) throw new Error(error.message);
      return z.array(idSchema).parse(data ?? []).length > 0;
    },
  };
}
