-- T-003: identidad y pedidos con RLS (SPEC-001, ADR-002).
-- Principios:
--   * RLS activada en todas las tablas; sin política = acceso denegado.
--   * Se revocan los privilegios por defecto de anon/authenticated y se
--     conceden solo los necesarios (defensa en profundidad con RLS).
--   * Los pedidos solo los crea el servidor (service_role, que salta RLS):
--     el cliente nunca inserta importes (CA-10).
--   * Importes en céntimos enteros (RNF-08).

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.order_status as enum (
  'pendiente', 'pagado', 'preparado', 'enviado', 'entregado', 'cancelado'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Función auxiliar: ¿el usuario actual es admin? SECURITY DEFINER evita la
-- recursión de RLS al consultar profiles desde sus propias políticas.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Crea el perfil al registrarse. Siempre con rol 'customer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Solo full_name es editable por el cliente: role queda fuera (column privilege).
grant update (full_name) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert y delete: sin política => denegado (el perfil lo crea el trigger y se
-- borra en cascada con auth.users).

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  city text not null check (char_length(city) between 1 and 100),
  province text not null check (char_length(province) between 1 and 100),
  country text not null default 'ES' check (country = 'ES'),
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);

alter table public.addresses enable row level security;

revoke all on public.addresses from anon, authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

create policy addresses_select_own on public.addresses
  for select to authenticated using (user_id = auth.uid());

create policy addresses_insert_own on public.addresses
  for insert to authenticated with check (user_id = auth.uid());

create policy addresses_update_own on public.addresses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy addresses_delete_own on public.addresses
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- on delete set null: al dar de baja la cuenta el pedido se anonimiza (spec §9).
  user_id uuid references auth.users (id) on delete set null,
  status public.order_status not null default 'pendiente',
  total_cents integer not null check (total_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  -- Instantánea de la dirección en el momento de la compra.
  shipping_address jsonb not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
-- El admin solo puede cambiar el estado (las transiciones válidas las valida el servidor).
grant update (status) on public.orders to authenticated;

create policy orders_select_own_or_admin on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy orders_update_admin on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- insert y delete: sin política => denegado. Los crea el servidor (service_role).

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- variant_id sin FK todavía: product_variants llega en T-003b.
  variant_id uuid not null,
  product_name text not null,
  size text not null,
  color text not null,
  qty integer not null check (qty > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

create policy order_items_select_via_order on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- insert, update y delete: sin política => denegado (solo service_role).

-- ---------------------------------------------------------------------------
-- stripe_events (idempotencia del webhook; solo servidor)
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;
-- Sin políticas ni grants: solo service_role (salta RLS) puede usarla.
