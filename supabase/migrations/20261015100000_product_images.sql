-- T-005a: imágenes de producto (SPEC-001, RF-02 y RF-09).
-- Decisión del usuario: por ahora las imágenes son ficheros en public/products/
-- y la tabla guarda su ruta relativa. Supabase Storage llega con T-010a: bastará
-- cambiar la ruta. Mismo patrón de privilegios que el resto del catálogo.

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Ruta relativa bajo /products/. Sin URLs externas ni caracteres raros.
  path text not null check (path ~ '^/products/[a-z0-9]+(-[a-z0-9]+)*\.(svg|webp|avif|jpg|png)$'),
  -- Texto alternativo obligatorio (accesibilidad, WCAG AA).
  alt text not null check (char_length(alt) between 1 and 200),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

-- Una imagen es visible si su producto lo es (activo, o el usuario es admin).
create policy product_images_select_via_product on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.active or public.is_admin())
    )
  );

create policy product_images_insert_admin on public.product_images
  for insert to authenticated
  with check (public.is_admin());

create policy product_images_update_admin on public.product_images
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy product_images_delete_admin on public.product_images
  for delete to authenticated
  using (public.is_admin());
