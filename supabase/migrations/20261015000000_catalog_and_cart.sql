-- T-003b: catálogo y carrito con RLS (SPEC-001 + Enmienda 1, ADR-002).
-- Principios (los mismos que en T-003):
--   * RLS activada en todas las tablas; sin política = acceso denegado.
--   * Se revocan los privilegios por defecto de anon/authenticated y se
--     conceden solo los necesarios (defensa en profundidad con RLS).
--   * El catálogo es de lectura pública; solo el admin escribe.
--   * Importes en céntimos enteros (RNF-08).
-- Fuera de esta migración (a propósito):
--   * Precio de referencia e historial de precios: T-003c, tras su ADR.
--   * Imágenes de producto y Storage: T-005 / T-010a.
--   * FK de order_items.variant_id: se decide en T-008, cuando existan
--     variantes reales en los pedidos.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 4000),
  gender text not null check (gender in ('hombre', 'mujer')),
  category text not null check (category in ('polos', 'camisas', 'blusas', 'pantalones')),
  -- Enmienda 1: faceta Ocasión (RF-19) y datos de ajuste (RF-20).
  occasion text not null check (occasion in ('casual', 'vestir')),
  is_new boolean not null default false,
  composition text check (composition is null or char_length(composition) <= 500),
  care text check (care is null or char_length(care) <= 500),
  model_height_cm integer check (model_height_cm is null or model_height_cm between 100 and 250),
  model_size text check (model_size is null or char_length(model_size) <= 10),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_listing_idx on public.products (active, gender, category);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

create policy products_select_active_or_admin on public.products
  for select to anon, authenticated
  using (active or public.is_admin());

create policy products_insert_admin on public.products
  for insert to authenticated
  with check (public.is_admin());

create policy products_update_admin on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy products_delete_admin on public.products
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null check (char_length(size) between 1 and 10),
  color text not null check (char_length(color) between 1 and 40),
  price_cents integer not null check (price_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

-- Una variante es visible si su producto lo es (activo, o el usuario es admin).
create policy product_variants_select_via_product on public.product_variants
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.active or public.is_admin())
    )
  );

create policy product_variants_insert_admin on public.product_variants
  for insert to authenticated
  with check (public.is_admin());

create policy product_variants_update_admin on public.product_variants
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy product_variants_delete_admin on public.product_variants
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- size_guides (RF-18): una fila por categoría; lectura pública, escritura admin.
-- ---------------------------------------------------------------------------
create table public.size_guides (
  category text primary key check (category in ('polos', 'camisas', 'blusas', 'pantalones')),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger size_guides_set_updated_at
  before update on public.size_guides
  for each row execute function public.set_updated_at();

alter table public.size_guides enable row level security;

revoke all on public.size_guides from anon, authenticated;
grant select on public.size_guides to anon, authenticated;
grant insert, update, delete on public.size_guides to authenticated;

create policy size_guides_select_public on public.size_guides
  for select to anon, authenticated
  using (true);

create policy size_guides_insert_admin on public.size_guides
  for insert to authenticated
  with check (public.is_admin());

create policy size_guides_update_admin on public.size_guides
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy size_guides_delete_admin on public.size_guides
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- carts y cart_items (solo del propietario)
-- ---------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

alter table public.carts enable row level security;

revoke all on public.carts from anon, authenticated;
grant select, insert, update, delete on public.carts to authenticated;

create policy carts_select_own on public.carts
  for select to authenticated using (user_id = auth.uid());

create policy carts_insert_own on public.carts
  for insert to authenticated with check (user_id = auth.uid());

create policy carts_update_own on public.carts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy carts_delete_own on public.carts
  for delete to authenticated using (user_id = auth.uid());

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  qty integer not null check (qty between 1 and 99),
  unique (cart_id, variant_id)
);

create index cart_items_cart_id_idx on public.cart_items (cart_id);

alter table public.cart_items enable row level security;

revoke all on public.cart_items from anon, authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

create policy cart_items_select_own on public.cart_items
  for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));

create policy cart_items_insert_own on public.cart_items
  for insert to authenticated
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));

create policy cart_items_update_own on public.cart_items
  for update to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));

create policy cart_items_delete_own on public.cart_items
  for delete to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- stock_reservations (solo servidor y admin; la lógica llega en T-008)
-- ---------------------------------------------------------------------------
create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  qty integer not null check (qty > 0),
  expires_at timestamptz not null,
  status text not null default 'activa' check (status in ('activa', 'consumida', 'liberada')),
  created_at timestamptz not null default now()
);

create index stock_reservations_variant_status_idx on public.stock_reservations (variant_id, status);
create index stock_reservations_order_id_idx on public.stock_reservations (order_id);

alter table public.stock_reservations enable row level security;

revoke all on public.stock_reservations from anon, authenticated;
grant select on public.stock_reservations to authenticated;

create policy stock_reservations_select_admin on public.stock_reservations
  for select to authenticated
  using (public.is_admin());

-- insert, update y delete: sin política => denegado (solo service_role).
