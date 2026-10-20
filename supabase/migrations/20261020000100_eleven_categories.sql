-- T-055 (Enmienda 25 de SPEC-001): las categorías de ropa pasan de nueve a once (se añaden `abrigos` y `jerseis`).
-- Solo cambian los CHECK de `products.category` y `size_guides.category`; RLS, columnas e índices no se tocan.
-- Se aplica a mano: supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).

alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (category in ('polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'abrigos', 'jerseis', 'faldas', 'tops'));

alter table public.size_guides
  drop constraint if exists size_guides_category_check;

alter table public.size_guides
  add constraint size_guides_category_check
  check (category in ('polos', 'camisas', 'blusas', 'pantalones', 'camisetas', 'sudaderas', 'chaquetas', 'abrigos', 'jerseis', 'faldas', 'tops'));
