-- T-041 (ADR-010, RF-24, CA-75): favoritos del cliente. Solo con cuenta y en la BD.
-- RLS activada ANTES de consumir datos (I3): cada cliente ve, crea y borra solo los suyos; sin `update` (se borra y se
-- vuelve a crear); `anon` sin ningún permiso. El `insert` solo admite productos que el cliente puede ver (activos): la
-- subconsulta a `products` pasa por su RLS.
-- Se aplica a mano: supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).
-- Idempotente: se puede aplicar más de una vez.

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

revoke all on public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.products p where p.id = product_id)
  );

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));
