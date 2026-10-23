import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { generateCouponCode } from '../../src/lib/coupons/code';
import { sampleAddress, type TestUser } from './helpers';

// Datos de prueba compartidos por los tests de integración del cupón de bienvenida (T-093). Todo se crea con la clave de
// servicio o con el cliente de un usuario de prueba, y cada test lo borra al terminar.

const idSchema = z.object({ id: z.string() });

/** Etiqueta única para el color de las variantes de prueba: así no chocan con las de otros tests. */
export const newTag = (): string => `zz${randomUUID().replace(/[^a-f]/g, '').slice(0, 8)}`;

export async function createProduct(admin: SupabaseClient, label: string): Promise<string> {
  const inserted = await admin
    .from('products')
    .insert({
      slug: `${label}-${randomUUID().slice(0, 8)}`,
      name: `Producto ${label}`,
      gender: 'hombre',
      category: 'polos',
      occasion: 'casual',
    })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createProduct: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

export async function createVariant(
  admin: SupabaseClient,
  productId: string,
  tag: string,
  size: string,
  priceCents: number,
  stock: number,
): Promise<string> {
  const inserted = await admin
    .from('product_variants')
    .insert({ product_id: productId, size, color: tag, price_cents: priceCents, stock })
    .select('id')
    .single();
  if (inserted.error) throw new Error(`createVariant: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

export async function createAddress(owner: TestUser): Promise<string> {
  const inserted = await owner.client.from('addresses').insert({ user_id: owner.id, ...sampleAddress }).select('id').single();
  if (inserted.error) throw new Error(`createAddress: ${inserted.error.message}`);
  return idSchema.parse(inserted.data).id;
}

export interface TestCoupon {
  readonly id: string;
  readonly code: string;
  readonly email: string;
}

export const newCouponEmail = (): string => `t093-${randomUUID().slice(0, 8)}@example.com`;

/** Cupón creado directamente con la clave de servicio; `overrides` permite fijar caducidad o canje. */
export async function createCoupon(admin: SupabaseClient, overrides: Record<string, unknown> = {}): Promise<TestCoupon> {
  const inserted = await admin
    .from('welcome_coupons')
    .insert({ code: generateCouponCode(), email: newCouponEmail(), ...overrides })
    .select('id, code, email')
    .single();
  if (inserted.error) throw new Error(`createCoupon: ${inserted.error.message}`);
  return z.object({ id: z.string(), code: z.string(), email: z.string() }).parse(inserted.data);
}

export const DAY_MS = 86_400_000;
