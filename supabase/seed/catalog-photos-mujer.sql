-- T-038 (ADR-009): fotos reales de los seis productos de mujer del catálogo de ejemplo.
-- Requiere la migración 20261019000000_product_images_path_images_dir.sql y las fotos de
-- public/images/products/ (las genera `pnpm optimize-images`). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-photos-mujer.sql
-- Idempotente: solo sustituye la imagen de posición 0; las posiciones 1, 2… (SVG por color) se conservan.
-- Formato WebP: se ve en todos los navegadores (el WebKit de Playwright no decodifica AVIF).
-- Texto alternativo: la ficha elige la imagen cuyo `alt` termina en «color <nombre>» (variant-selection.ts).
-- Si la foto coincide con un color del seed, el `alt` lo lleva y esa foto es la de ese color. Las dos blusas
-- cremas (lino y popelín) no tienen ese color en el seed (blanco y beige / blanco y azul): sin sufijo, son la
-- imagen por defecto y salen con «blanco».

with photo (slug, path, alt) as (
  values
    ('blusa-lino-casual',       '/images/products/blusa-lino-crema.webp',        'Blusa de lino crema de manga larga con puños doblados y botones de carey'),
    ('blusa-satinada-vestir',   '/images/products/blusa-satinada-burdeos.webp',  'Blusa satinada burdeos de manga larga con cuello de camisa, color burdeos'),
    ('blusa-popelin-lazada',    '/images/products/blusa-popelin-lazada.webp',    'Blusa de popelín crema de manga larga con lazada al cuello'),
    ('polo-punto-mujer',        '/images/products/polo-punto-verde.webp',        'Polo de punto verde salvia de manga corta con botones, color verde'),
    ('camisa-oversize-mujer',   '/images/products/camisa-oversize-azul.webp',    'Camisa oversize azul con bolsillo de parche, color azul'),
    ('pantalon-fluido-vestir',  '/images/products/pantalon-fluido-negro.webp',   'Pantalón fluido negro de talle alto y pernera ancha con dobladillo, color negro')
)
update public.product_images i
set path = photo.path,
    alt = photo.alt
from photo
join public.products p on p.slug = photo.slug
where i.product_id = p.id
  and i.position = 0;
