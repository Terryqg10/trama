-- T-092 (Enmienda 41 de SPEC-001, RF-27, CA-134): cupón de bienvenida del 10 % que se muestra en pantalla al suscribirse.
-- La tabla solo la toca el servidor con la clave de servicio: RLS activada SIN ninguna política y sin permisos para
-- `anon` ni `authenticated`, así que ni la clave pública ni un cliente con sesión (ni un admin) pueden leer, insertar,
-- cambiar ni borrar. Un pedido guarda el descuento y el cupón; un cupón solo puede estar en un pedido no cancelado.
-- Se aplica a mano: supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).
-- Idempotente: se puede aplicar más de una vez.

create table if not exists public.welcome_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  email text not null,
  percent_off smallint not null default 10,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  redeemed_at timestamptz,
  redeemed_order_id uuid references public.orders (id) on delete set null,
  constraint welcome_coupons_code_key unique (code),
  -- Un código por email (el mismo email recibe el mismo código mientras sea válido).
  constraint welcome_coupons_email_key unique (email),
  constraint welcome_coupons_percent_off_check check (percent_off between 1 and 100),
  -- TRAMA-XXXX-XXXX con un alfabeto sin ambiguos: sin 0, 1, I, L ni O.
  constraint welcome_coupons_code_check check (code ~ '^TRAMA-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$'),
  constraint welcome_coupons_email_check
    check (email = lower(email) and char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table public.welcome_coupons enable row level security;

-- Sin permisos y sin políticas: con RLS activa, todo queda denegado salvo para la clave de servicio.
revoke all on table public.welcome_coupons from anon, authenticated;

-- Pedido: descuento y cupón aplicados. El cliente solo tiene permiso de lectura sobre `orders` (y el admin de `status`),
-- así que ninguno de los dos puede cambiar estas columnas.
alter table public.orders add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.orders add column if not exists coupon_id uuid references public.welcome_coupons (id) on delete set null;

-- Un cupón no puede estar en dos pedidos no cancelados (un nuevo intento de pago cancela el pendiente anterior).
create unique index if not exists orders_coupon_id_active_key
  on public.orders (coupon_id)
  where coupon_id is not null and status <> 'cancelado';
