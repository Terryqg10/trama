-- T-045 (Enmienda 22 de SPEC-001): 21 productos nuevos del catálogo de ejemplo (FICTICIOS: datos y precios de ejemplo).
-- Requiere la migración 20261020000000_nine_categories.sql (T-044) y las fotos de public/images/products/
-- (las genera `pnpm optimize-images`). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-new-products.sql
-- Idempotente: todo es `on conflict do nothing`. Todos son casual, no son novedad, están activos y tienen 8
-- unidades por variante. La camisa de franela cuesta 44,90 € (precio no fijado: VERIFICAR).
-- Formato de imagen WebP (el WebKit de Playwright no decodifica AVIF). El texto alternativo termina en
-- «color <nombre>»: la ficha elige la imagen por ese sufijo (variant-selection.ts).

with p (slug, name, description, gender, category, composition, care, model_height_cm, model_size) as (
  values
    ('sudadera-oversize-negra', 'Sudadera oversize negra', 'Sudadera de corte oversize en felpa de algodón, con cuello redondo y puños acanalados.', 'hombre', 'sudaderas', '80% algodón, 20% poliéster', 'Lavar a 30 °C del revés. No usar secadora.', 185, 'M'),
    ('hoodie-gris', 'Hoodie gris', 'Hoodie de felpa con capucha y bolsillo canguro.', 'hombre', 'sudaderas', '80% algodón, 20% poliéster', 'Lavar a 30 °C del revés. No usar secadora.', 185, 'M'),
    ('camiseta-grafica-blanca', 'Camiseta gráfica blanca', 'Camiseta blanca de manga corta con estampado gráfico en el pecho.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('camiseta-negra-hombre', 'Camiseta negra', 'Camiseta negra de manga corta y corte relajado.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('polera-comic-art', 'Polera cómic art', 'Polera blanca oversize con una portada de cómic retro estampada.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('polera-dark-art', 'Polera dark art', 'Polera negra desteñida con un estampado gótico de murciélago.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('polera-aranaz', 'Polera Arañaz', 'Polera oversize con estampado integral de telarañas y la máscara de un héroe.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 185, 'M'),
    ('polera-verde-grafico', 'Polera verde gráfico', 'Polera verde oversize con un puño verde rompiendo un muro estampado.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 180, 'M'),
    ('polera-pop-collage', 'Polera pop collage', 'Polera negra desteñida con un collage de portadas de cómic estampado.', 'hombre', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 180, 'M'),
    ('pantalon-cargo-negro', 'Pantalón cargo negro', 'Pantalón cargo de pernera ancha con bolsillos de fuelle y cintas.', 'hombre', 'pantalones', '100% algodón', 'Lavar a 30 °C. No usar secadora.', 185, '40'),
    ('chaqueta-cortavientos-gris', 'Chaqueta cortavientos gris', 'Chaqueta cortavientos ligera con cremallera.', 'hombre', 'chaquetas', '100% poliéster', 'Lavar a 30 °C. No planchar. Secar tendido.', 185, 'M'),
    ('bomber-negra', 'Bomber negra', 'Bomber con cierre de cremallera y puños elásticos.', 'hombre', 'chaquetas', '100% poliéster', 'Lavar a 30 °C. No planchar. Secar tendido.', 185, 'M'),
    ('camisa-franela-oversize', 'Camisa de franela oversize', 'Camisa de franela a cuadros verdes y azul marino, de corte oversize y con bolsillo en el pecho.', 'hombre', 'camisas', '100% algodón', 'Lavar a 30 °C. Planchar a temperatura media.', 185, 'M'),
    ('top-crop-negro', 'Top crop negro', 'Top crop ajustado de algodón elástico.', 'mujer', 'tops', '95% algodón, 5% elastano', 'Lavar a 30 °C. No usar secadora.', 175, 'S'),
    ('falda-cargo-negra', 'Falda cargo negra', 'Falda cargo con bolsillos de fuelle.', 'mujer', 'faldas', '100% algodón', 'Lavar a 30 °C. No usar secadora.', 175, '38'),
    ('sudadera-cropped-rosa', 'Sudadera cropped rosa', 'Sudadera cropped con el bajo sin rematar y cuello redondo.', 'mujer', 'sudaderas', '80% algodón, 20% poliéster', 'Lavar a 30 °C del revés. No usar secadora.', 175, 'S'),
    ('polera-kawaii-blanca', 'Polera kawaii blanca', 'Polera blanca con un personaje kawaii estampado en el pecho.', 'mujer', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 175, 'S'),
    ('polera-kawaii-negra', 'Polera kawaii negra', 'Polera oversize negra con un personaje kawaii estampado en el pecho.', 'mujer', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 175, 'S'),
    ('polera-comic-pop-mujer', 'Polera pop cómic', 'Camiseta blanca entallada con un estampado pop art de viñetas.', 'mujer', 'camisetas', '100% algodón', 'Lavar a 30 °C. No usar lejía. Secar tendido.', 175, 'S'),
    ('pantalon-cargo-mujer-beige', 'Pantalón cargo beige', 'Pantalón cargo de pernera ancha con bolsillos de fuelle y cintas.', 'mujer', 'pantalones', '100% algodón', 'Lavar a 30 °C. No usar secadora.', 175, '38'),
    ('chaqueta-vaquera-oversize', 'Chaqueta vaquera oversize', 'Chaqueta vaquera oversize en denim azul con botones metálicos.', 'mujer', 'chaquetas', '100% algodón', 'Lavar a 30 °C del revés. No usar secadora.', 175, 'S')
)
insert into public.products (slug, name, description, gender, category, occasion, is_new, composition, care, model_height_cm, model_size, active)
select slug, name, description, gender, category, 'casual', false, composition, care, model_height_cm, model_size, true
from p
on conflict (slug) do nothing;

with v (slug, sizes, color, price_cents) as (
  values
    ('sudadera-oversize-negra', array['S','M','L','XL'], 'negro', 4990),
    ('hoodie-gris', array['S','M','L','XL'], 'gris', 4990),
    ('camiseta-grafica-blanca', array['S','M','L','XL'], 'blanco', 2990),
    ('camiseta-negra-hombre', array['S','M','L','XL'], 'negro', 2990),
    ('polera-comic-art', array['S','M','L','XL'], 'blanco', 2990),
    ('polera-dark-art', array['S','M','L','XL'], 'negro', 2990),
    ('polera-aranaz', array['S','M','L','XL'], 'rojo', 2990),
    ('polera-verde-grafico', array['S','M','L','XL'], 'verde', 2990),
    ('polera-pop-collage', array['S','M','L','XL'], 'negro', 2990),
    ('pantalon-cargo-negro', array['38','40','42','44'], 'negro', 5990),
    ('chaqueta-cortavientos-gris', array['S','M','L','XL'], 'gris', 6990),
    ('bomber-negra', array['S','M','L','XL'], 'negro', 6990),
    ('camisa-franela-oversize', array['S','M','L','XL'], 'verde', 4490),
    ('top-crop-negro', array['XS','S','M','L'], 'negro', 1990),
    ('falda-cargo-negra', array['34','36','38','40','42'], 'negro', 1990),
    ('sudadera-cropped-rosa', array['XS','S','M','L'], 'rosa', 4990),
    ('polera-kawaii-blanca', array['XS','S','M','L'], 'blanco', 2990),
    ('polera-kawaii-negra', array['XS','S','M','L'], 'negro', 2990),
    ('polera-comic-pop-mujer', array['XS','S','M','L'], 'blanco', 2990),
    ('pantalon-cargo-mujer-beige', array['34','36','38','40','42'], 'beige', 5990),
    ('chaqueta-vaquera-oversize', array['XS','S','M','L'], 'azul', 6990)
)
insert into public.product_variants (product_id, size, color, price_cents, stock)
select pr.id, s.size, v.color, v.price_cents, 8
from v
join public.products pr on pr.slug = v.slug
cross join lateral unnest(v.sizes) as s(size)
on conflict (product_id, size, color) do nothing;

with i (slug, path, alt) as (
  values
    ('sudadera-oversize-negra', '/images/products/sudadera-oversize-negra.webp', 'Sudadera oversize negra de cuello redondo, color negro'),
    ('hoodie-gris', '/images/products/hoodie-gris.webp', 'Hoodie gris con capucha y bolsillo canguro, color gris'),
    ('camiseta-grafica-blanca', '/images/products/camiseta-grafica-blanca.webp', 'Camiseta blanca de manga corta con estampado gráfico, color blanco'),
    ('camiseta-negra-hombre', '/images/products/camiseta-negra-hombre.webp', 'Camiseta negra de manga corta y corte relajado, color negro'),
    ('polera-comic-art', '/images/products/polera-comic-hero.webp', 'Polera blanca oversize con una portada de cómic retro estampada, color blanco'),
    ('polera-dark-art', '/images/products/polera-dark-hero.webp', 'Polera negra desteñida con estampado gótico de un murciélago, color negro'),
    ('polera-aranaz', '/images/products/polera-spider-verse.webp', 'Polera oversize roja y azul con telarañas y una máscara de héroe estampadas, color rojo'),
    ('polera-verde-grafico', '/images/products/polera-hulk-smash.webp', 'Polera verde oversize con un puño verde rompiendo un muro de ladrillo, color verde'),
    ('polera-pop-collage', '/images/products/polera-team-heroes.webp', 'Polera negra desteñida con un collage de portadas de cómic, color negro'),
    ('pantalon-cargo-negro', '/images/products/pantalon-cargo-negro.webp', 'Pantalón cargo negro de pernera ancha con bolsillos de fuelle, color negro'),
    ('chaqueta-cortavientos-gris', '/images/products/chaqueta-cortavientos-gris.webp', 'Chaqueta cortavientos gris ligera con cremallera, color gris'),
    ('bomber-negra', '/images/products/bomber-negra.webp', 'Bomber negra con cremallera y puños elásticos, color negro'),
    ('camisa-franela-oversize', '/images/products/camisa-franela-oversize.webp', 'Camisa de franela oversize a cuadros verdes y azul marino, color verde'),
    ('top-crop-negro', '/images/products/top-crop-negro.webp', 'Top crop negro ajustado de algodón elástico, color negro'),
    ('falda-cargo-negra', '/images/products/falda-cargo-negra.webp', 'Falda cargo negra con bolsillos de fuelle, color negro'),
    ('sudadera-cropped-rosa', '/images/products/sudadera-cropped-rosa.webp', 'Sudadera cropped rosa con el bajo sin rematar, color rosa'),
    ('polera-kawaii-blanca', '/images/products/polera-hello-kitty-blanca.webp', 'Polera blanca con un personaje kawaii estampado en el pecho, color blanco'),
    ('polera-kawaii-negra', '/images/products/polera-hello-kitty-negra.webp', 'Polera oversize negra con un personaje kawaii blanco con lazo rojo, color negro'),
    ('polera-comic-pop-mujer', '/images/products/polera-comic-pop-mujer.webp', 'Camiseta blanca entallada con un estampado pop art de viñetas, color blanco'),
    ('pantalon-cargo-mujer-beige', '/images/products/pantalon-cargo-mujer-beige.webp', 'Pantalón cargo beige de pernera ancha con bolsillos de fuelle, color beige'),
    ('chaqueta-vaquera-oversize', '/images/products/chaqueta-vaquera-oversize.webp', 'Chaqueta vaquera oversize azul con botones metálicos, color azul')
)
insert into public.product_images (product_id, path, alt, position)
select pr.id, i.path, i.alt, 0
from i
join public.products pr on pr.slug = i.slug
on conflict (product_id, position) do nothing;
