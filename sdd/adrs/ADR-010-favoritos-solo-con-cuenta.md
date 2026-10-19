---
id: ADR-010
title: Los favoritos solo existen con la cuenta iniciada y se guardan en la base de datos
status: aceptada
date: 2026-10-20
os_version: 0.6.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, ADR-002-supabase-en-la-nube]
---

# ADR-010 — Favoritos solo con cuenta

## Contexto

El estilo v1 prevé un corazón de favoritos y el usuario quiere un apartado «Favoritos» claro. La spec deja la
wishlist fuera de alcance (§2, punto 6), así que añadirla cambia el alcance. Hay que decidir dónde se guardan y
quién puede usarlos.

## Alternativas consideradas

1. **Solo con cuenta, en la BD (`favorites` con RLS).** Pulsar el corazón sin sesión lleva a iniciar sesión y
   vuelve a la ficha. Un solo origen de verdad, sin fusiones. Exige registro para usar la función.
2. **Invitados en el navegador y cuenta en la BD, con fusión al entrar** (como el carrito). Más cómodo para el
   visitante, pero duplica la lógica (almacén local, fusión, conflictos) y deja un segundo origen de datos.
3. **Solo en el navegador (`localStorage`).** Mínimo trabajo, pero no hay «apartado» fiable: se pierde al cambiar de
   dispositivo y no se puede probar RLS ni aislamiento.

## Decisión

La alternativa 1. Los favoritos se guardan en `public.favorites (user_id, product_id)` con RLS: cada usuario solo
ve, crea y borra los suyos. Sin sesión, el corazón lleva a `/acceso` con retorno a la ficha, y tras entrar el
producto queda añadido. El corazón en las tarjetas del listado queda fuera de esta decisión.

## Consecuencias

Positivas:
- Un solo origen de datos, con RLS y prueba de aislamiento (I3).
- El apartado «Favoritos» es el mismo en cualquier dispositivo.
- Sin lógica de fusión.

Negativas:
- Un visitante sin cuenta no puede guardar favoritos hasta registrarse.
- Datos personales nuevos (preferencias del cliente): se actualiza la sección 9 de la spec.
- Una migración y una tabla nuevas en Supabase, que aplica el usuario con la CLI.

Coste de revertir: medio. Habría que migrar o descartar las filas de `favorites`.

## Relación con la constitución

- I3: RLS antes de consumir datos y prueba de aislamiento entre usuarios.
- I5: la entrada de las acciones (id de producto) se valida con Zod.
- I9: cada CA tiene su test (RLS, e2e).
