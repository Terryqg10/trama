-- T-075 (Enmienda 32 de SPEC-001, CA-118): cinco prendas de ejemplo con precio anterior (rebajas FICTICIAS: precios de
-- ejemplo, como el resto del catálogo; VERIFICAR antes de usarlas en una tienda real).
-- Requiere la migración 20261021000000_compare_at_price.sql y el seed de `catalog-autumn.sql`. Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f supabase/seed/catalog-discounts.sql
-- Idempotente: fija siempre el mismo precio anterior. Descuentos resultantes: 25 %, 20 %, 23 %, 25 % y 25 %.

update public.product_variants as v
set compare_at_cents = d.compare_at_cents
from public.products as p,
  (values
    ('abrigo-pano-gris', 11990),
    ('chaqueta-acolchada-negra', 9990),
    ('abrigo-largo-camel', 12990),
    ('jersey-punto-crema', 5990),
    ('jersey-punto-marron', 5990)
  ) as d (slug, compare_at_cents)
where p.id = v.product_id
  and p.slug = d.slug
  and d.compare_at_cents > v.price_cents;
