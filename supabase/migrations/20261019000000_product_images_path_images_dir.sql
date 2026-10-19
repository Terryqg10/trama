-- T-036 (ADR-009): las fotos reales del catálogo inicial viven en public/images/products/.
-- `product_images.path` acepta ahora /products/ (SVG heredados) y /images/products/.
-- Solo cambia el CHECK de la ruta; RLS, columnas e índices no se tocan.
-- Se aplica a mano en el SQL Editor de Supabase (ADR-002).

alter table public.product_images
  drop constraint if exists product_images_path_check;

alter table public.product_images
  add constraint product_images_path_check
  check (path ~ '^/(products|images/products)/[a-z0-9]+(-[a-z0-9]+)*\.(svg|webp|avif|jpg|png)$');
