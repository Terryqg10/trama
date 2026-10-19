-- T-036 (ADR-009): fotos reales de seis productos del catálogo de ejemplo.
-- Requiere la migración 20261019000000_product_images_path_images_dir.sql y las fotos de
-- public/images/products/ (las genera `pnpm optimize-images`). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-photos.sql
-- Idempotente: solo sustituye la imagen de posición 0; las posiciones 1, 2… (SVG por color) se conservan.
-- Formato WebP: se ve en todos los navegadores (el WebKit de Playwright no decodifica AVIF).
-- Texto alternativo: la ficha elige la imagen cuyo `alt` termina en «color <nombre>» (variant-selection.ts).
-- Si la foto coincide con un color del seed, el `alt` lo lleva y esa foto es la de ese color; la camisa de
-- popelín es crema (el seed no tiene ese color): sin sufijo, es la imagen por defecto y sale con «blanco».

with photo (slug, path, alt) as (
  values
    ('polo-pique-basico',      '/images/products/polo-pique-azul-marino.webp',       'Polo piqué azul marino de manga corta, color azul'),
    ('polo-punto-manga-larga', '/images/products/polo-punto-gris-manga-larga.webp',  'Polo de punto gris de manga larga, color gris'),
    ('camisa-oxford-algodon',  '/images/products/camisa-oxford-blanca.webp',         'Camisa oxford blanca con cuello abotonado, color blanco'),
    ('camisa-popelin-vestir',  '/images/products/camisa-popelin-crema.webp',         'Camisa de popelín de color crema, vista frontal'),
    ('pantalon-chino-slim',    '/images/products/pantalon-chino-beige.webp',         'Pantalón chino beige de corte slim, color beige'),
    ('pantalon-traje-lana',    '/images/products/pantalon-vestir-gris-marengo.webp', 'Pantalón de vestir gris marengo, color gris')
)
update public.product_images i
set path = photo.path,
    alt = photo.alt
from photo
join public.products p on p.slug = photo.slug
where i.product_id = p.id
  and i.position = 0;
