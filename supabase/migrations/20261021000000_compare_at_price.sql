-- T-075 (Enmienda 32 de SPEC-001, CA-118): precio anterior de una variante, para mostrar «-N %» y el precio tachado.
-- Solo añade una columna opcional y su CHECK; RLS, políticas, grants e índices no se tocan: la columna se lee con el mismo
-- `select` público de variantes (`product_variants_select_via_product`) y se escribe con las políticas de admin.
-- Es aditiva y anulable: el código anterior sigue funcionando sin ella.
-- Se aplica a mano: supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).

alter table public.product_variants
  add column if not exists compare_at_cents integer;

alter table public.product_variants
  drop constraint if exists product_variants_compare_at_check;

-- Si hay precio anterior, es mayor que el actual (de lo contrario no hay rebaja).
alter table public.product_variants
  add constraint product_variants_compare_at_check
  check (compare_at_cents is null or compare_at_cents > price_cents);
