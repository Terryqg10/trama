-- T-101 (SPEC-005, DP-6, CA-06): marca como novedad 8 productos que YA existen en el catálogo (datos de ejemplo).
-- Cuatro de hombre y cuatro de mujer, de los 21 de `catalog-new-products.sql` (requiere ese seed). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-new-flags.sql
-- Idempotente: fija siempre el mismo valor. Solo cambia `is_new`: no toca stock, precios ni otras columnas.
-- Reversible: `update public.products set is_new = false where slug in (<los mismos 8>);`

update public.products
set is_new = true
where slug in (
  'sudadera-oversize-negra',
  'bomber-negra',
  'camisa-franela-oversize',
  'chaqueta-cortavientos-gris',
  'sudadera-cropped-rosa',
  'chaqueta-vaquera-oversize',
  'top-crop-negro',
  'pantalon-cargo-mujer-beige'
);
