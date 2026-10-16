-- T-005a: datos de ejemplo del catálogo (FICTICIOS: sin marcas ni productos reales).
-- Idempotente: se puede ejecutar varias veces; no duplica ni pisa datos existentes
-- (todo es `on conflict do nothing`). Requiere las migraciones de T-003b y T-005a.
-- Se aplica a mano en el SQL Editor de Supabase. Las imágenes (SVG placeholder)
-- viven en public/products/ y las genera `node scripts/generate-placeholders.mjs`.

with seed (slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size) as (
  values
    ('polo-pique-basico', 'Polo piqué básico', 'Polo de manga corta en piqué de algodón, corte regular.', 'hombre', 'polos', 'casual', true, '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('polo-punto-manga-larga', 'Polo de punto de manga larga', 'Polo de punto fino con cuello clásico, para entretiempo.', 'hombre', 'polos', 'vestir', false, '80% algodón, 20% poliamida', 'Lavar a 30 °C. Planchar a baja temperatura.', 184, 'M'),
    ('camisa-oxford-algodon', 'Camisa oxford de algodón', 'Camisa de tejido oxford con cuello abotonado.', 'hombre', 'camisas', 'casual', false, '100% algodón', 'Lavar a 40 °C. Planchar a temperatura media.', 185, 'L'),
    ('camisa-popelin-vestir', 'Camisa de popelín', 'Camisa de popelín con cuello clásico, ideal para vestir.', 'hombre', 'camisas', 'vestir', true, '100% algodón', 'Lavar a 40 °C. Planchar a temperatura media.', 186, 'M'),
    ('pantalon-chino-slim', 'Pantalón chino slim', 'Pantalón chino de corte slim en algodón elástico.', 'hombre', 'pantalones', 'casual', false, '98% algodón, 2% elastano', 'Lavar a 30 °C. No usar secadora.', 185, '40'),
    ('pantalon-traje-lana', 'Pantalón de traje', 'Pantalón de vestir con pinzas y caída recta.', 'hombre', 'pantalones', 'vestir', false, '55% poliéster, 43% lana, 2% elastano', 'Limpieza en seco recomendada.', 184, '40'),
    ('blusa-lino-casual', 'Blusa de lino', 'Blusa fluida de lino con manga corta.', 'mujer', 'blusas', 'casual', true, '100% lino', 'Lavar a 30 °C. Planchar con vapor.', 175, 'S'),
    ('blusa-satinada-vestir', 'Blusa satinada', 'Blusa de tacto satinado con cuello en pico.', 'mujer', 'blusas', 'vestir', true, '100% poliéster', 'Lavar a mano. No retorcer.', 176, 'S'),
    ('blusa-popelin-lazada', 'Blusa de popelín con lazada', 'Blusa de popelín con lazada al cuello.', 'mujer', 'blusas', 'vestir', false, '100% algodón', 'Lavar a 30 °C. Planchar a temperatura media.', 175, 'M'),
    ('polo-punto-mujer', 'Polo de punto', 'Polo de punto ligero con botones, corte regular.', 'mujer', 'polos', 'casual', false, '100% algodón', 'Lavar a 30 °C. Secar tendido.', 174, 'S'),
    ('camisa-oversize-mujer', 'Camisa oversize', 'Camisa de corte amplio en algodón.', 'mujer', 'camisas', 'casual', false, '100% algodón', 'Lavar a 40 °C. Planchar a temperatura media.', 175, 'M'),
    ('pantalon-fluido-vestir', 'Pantalón fluido', 'Pantalón de talle alto con caída fluida.', 'mujer', 'pantalones', 'vestir', false, '100% poliéster', 'Lavar a 30 °C. No usar secadora.', 176, '38')
)
insert into public.products
  (slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size)
select slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size
from seed
on conflict (slug) do nothing;

-- Variantes: producto × tallas × colores. `agotado` marca una combinación sin stock.
with spec (slug, sizes, colors, price_cents, out_size, out_color) as (
  values
    ('polo-pique-basico',       array['S','M','L','XL'],            array['azul','blanco','negro'],  2990, 'XL', 'negro'),
    ('polo-punto-manga-larga',  array['S','M','L','XL'],            array['gris','burdeos'],         4990, null,  null),
    ('camisa-oxford-algodon',   array['S','M','L','XL'],            array['blanco','azul'],          4490, 'S',  'azul'),
    ('camisa-popelin-vestir',   array['S','M','L','XL'],            array['blanco','negro'],         5490, 'L',  'negro'),
    ('pantalon-chino-slim',     array['38','40','42','44'],         array['beige','verde','azul'],   4990, '44', 'verde'),
    ('pantalon-traje-lana',     array['38','40','42','44'],         array['gris','negro'],           7990, null,  null),
    ('blusa-lino-casual',       array['XS','S','M','L'],            array['blanco','beige'],         3990, 'XS', 'beige'),
    ('blusa-satinada-vestir',   array['XS','S','M','L'],            array['burdeos','negro'],        4990, null,  null),
    ('blusa-popelin-lazada',    array['XS','S','M','L'],            array['blanco','azul'],          4290, 'L',  'azul'),
    ('polo-punto-mujer',        array['XS','S','M','L'],            array['verde','blanco'],         3490, null,  null),
    ('camisa-oversize-mujer',   array['XS','S','M','L'],            array['azul','blanco'],          4290, 'XS', 'blanco'),
    ('pantalon-fluido-vestir',  array['34','36','38','40','42'],    array['negro','gris'],           5990, '42', 'gris')
)
insert into public.product_variants (product_id, size, color, price_cents, stock)
select p.id, s.size, c.color, spec.price_cents,
       case when s.size = spec.out_size and c.color = spec.out_color then 0 else 8 end
from spec
join public.products p on p.slug = spec.slug
cross join lateral unnest(spec.sizes) as s(size)
cross join lateral unnest(spec.colors) as c(color)
on conflict (product_id, size, color) do nothing;

-- Imágenes: una por color, en orden. La ruta apunta al SVG de categoría y color.
with spec (slug, colors) as (
  values
    ('polo-pique-basico',       array['azul','blanco','negro']),
    ('polo-punto-manga-larga',  array['gris','burdeos']),
    ('camisa-oxford-algodon',   array['blanco','azul']),
    ('camisa-popelin-vestir',   array['blanco','negro']),
    ('pantalon-chino-slim',     array['beige','verde','azul']),
    ('pantalon-traje-lana',     array['gris','negro']),
    ('blusa-lino-casual',       array['blanco','beige']),
    ('blusa-satinada-vestir',   array['burdeos','negro']),
    ('blusa-popelin-lazada',    array['blanco','azul']),
    ('polo-punto-mujer',        array['verde','blanco']),
    ('camisa-oversize-mujer',   array['azul','blanco']),
    ('pantalon-fluido-vestir',  array['negro','gris'])
)
insert into public.product_images (product_id, path, alt, position)
select p.id,
       '/products/' || p.category || '-' || c.color || '.svg',
       p.name || ', color ' || c.color,
       c.ord - 1
from spec
join public.products p on p.slug = spec.slug
cross join lateral unnest(spec.colors) with ordinality as c(color, ord)
on conflict (product_id, position) do nothing;
