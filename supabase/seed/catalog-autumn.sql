-- T-056 (Enmienda 25 de SPEC-001): 6 productos de otoño del catálogo de ejemplo (FICTICIOS: datos y precios de ejemplo).
-- Requiere la migración 20261020000100_eleven_categories.sql (T-055) y las fotos de public/images/products/
-- (las genera `pnpm optimize-images`). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-autumn.sql
-- Idempotente: todo es `on conflict do nothing`. Todos son casual, no son novedad, están activos y tienen 8
-- unidades por variante. Precios, tallas, colores y composiciones son una propuesta: VERIFICAR.
-- Formato de imagen WebP (el WebKit de Playwright no decodifica AVIF). El texto alternativo termina en
-- «color <nombre>»: la ficha elige la imagen por ese sufijo (variant-selection.ts).

with p (slug, name, description, gender, category, composition, care, model_height_cm, model_size) as (
  values
    ('abrigo-pano-gris', 'Abrigo de paño gris', 'Abrigo recto de paño gris jaspeado, con solapas y cierre de botones.', 'hombre', 'abrigos', '70% lana, 30% poliéster', 'Limpieza en seco. No usar secadora.', 185, 'M'),
    ('jersey-cuello-alto-negro', 'Jersey de cuello alto negro', 'Jersey negro de punto fino con cuello alto y puños acanalados.', 'hombre', 'jerseis', '60% algodón, 40% acrílico', 'Lavar a 30 °C del revés. Secar tendido.', 185, 'M'),
    ('chaqueta-acolchada-negra', 'Chaqueta acolchada negra', 'Chaqueta acolchada negra con capucha, cremallera y bolsillos.', 'hombre', 'chaquetas', '100% poliéster, relleno de fibra', 'Lavar a 30 °C. No planchar. Secar tendido.', 185, 'M'),
    ('abrigo-largo-camel', 'Abrigo largo camel', 'Abrigo largo de corte recto en color camel, con solapas amplias y cinturón.', 'mujer', 'abrigos', '70% lana, 30% poliéster', 'Limpieza en seco. No usar secadora.', 175, 'S'),
    ('jersey-punto-crema', 'Jersey de punto crema', 'Jersey de punto grueso de trenzas, en color crema y de cuello redondo.', 'mujer', 'jerseis', '60% algodón, 40% acrílico', 'Lavar a 30 °C del revés. Secar tendido.', 175, 'S'),
    ('jersey-punto-marron', 'Jersey de punto marrón', 'Jersey de punto grueso en color marrón, de corte holgado y cuello redondo.', 'mujer', 'jerseis', '60% algodón, 40% acrílico', 'Lavar a 30 °C del revés. Secar tendido.', 175, 'S')
)
insert into public.products (slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size, active)
select slug, name, description, gender, category, 'casual', false, composition, care, model_height_cm, model_size, true
from p
on conflict (slug) do nothing;

with v (slug, sizes, color, price_cents) as (
  values
    ('abrigo-pano-gris', array['S','M','L','XL'], 'gris', 8990),
    ('jersey-cuello-alto-negro', array['S','M','L','XL'], 'negro', 3990),
    ('chaqueta-acolchada-negra', array['S','M','L','XL'], 'negro', 7990),
    ('abrigo-largo-camel', array['XS','S','M','L'], 'camel', 9990),
    ('jersey-punto-crema', array['XS','S','M','L'], 'crema', 4490),
    ('jersey-punto-marron', array['XS','S','M','L'], 'marron', 4490)
)
insert into public.product_variants (product_id, size, color, price_cents, stock)
select pr.id, s.size, v.color, v.price_cents, 8
from v
join public.products pr on pr.slug = v.slug
cross join lateral unnest(v.sizes) as s(size)
on conflict (product_id, size, color) do nothing;

with i (slug, path, alt) as (
  values
    ('abrigo-pano-gris', '/images/products/abrigo-pano-gris.webp', 'Abrigo recto de paño gris sobre un jersey negro de cuello alto, color gris'),
    ('jersey-cuello-alto-negro', '/images/products/jersey-cuello-alto-negro.webp', 'Jersey negro de punto fino con cuello alto, color negro'),
    ('chaqueta-acolchada-negra', '/images/products/chaqueta-acolchada-negra.webp', 'Chaqueta acolchada negra con capucha y cremallera, color negro'),
    ('abrigo-largo-camel', '/images/products/abrigo-largo-camel.webp', 'Abrigo largo de corte recto en color camel con solapas amplias, color camel'),
    ('jersey-punto-crema', '/images/products/jersey-punto-crema.webp', 'Jersey de punto grueso de trenzas en color crema, color crema'),
    ('jersey-punto-marron', '/images/products/jersey-punto-marron.webp', 'Jersey de punto grueso marrón de corte holgado, color marron')
)
insert into public.product_images (product_id, path, alt, position)
select pr.id, i.path, i.alt, 0
from i
join public.products pr on pr.slug = i.slug
on conflict (product_id, position) do nothing;
