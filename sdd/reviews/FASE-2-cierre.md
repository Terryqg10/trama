# Cierre de la Fase 2 — área de usuario, ofertas y mejoras de portada

- Fecha de cierre: 2026-10-26
- Último commit de la fase: `ba609a7` (subido a `main`)
- Specs: SPEC-005 (aprobada 2026-10-24, con 3 enmiendas) y SPEC-001 (enmiendas 42 a 45)
- Estilo: `v1-soft-commerce@0.3.0` en toda la fase (no hubo cambio de estilo)

## Tareas cerradas (todas con su review en `sdd/reviews/`)

| Tarea | Qué | Spec |
|---|---|---|
| T-098 | `/buscar` usa la tarjeta completa del catálogo (hover, tallas, añadir) | SPEC-001 Enm. 42 |
| T-099, T-100 | Consulta de ofertas desde `compare_at_cents` y `/ofertas` con banner con imagen | SPEC-005 |
| T-101 | 8 productos más con `is_new` (seed aplicado a `trama-dev`) | SPEC-005 |
| T-041 | Tabla `favorites` con RLS (migración aplicada a `trama-dev`) y módulo con Zod | SPEC-001 Enm. 21, ADR-010 |
| T-042, T-043 | Corazón de favoritos en la ficha y la barra fija; `/cuenta/favoritos` | SPEC-001 Enm. 21 |
| T-102 | Layout de `/cuenta` con barra lateral y pestañas en móvil | SPEC-005 |
| T-103, T-104 | Trama Club y Recomienda y gana (solo informativas, «Próximamente») | SPEC-005 |
| T-105 | Modal de acceso (login y registro) con imagen `auth-banner` | SPEC-005 |
| T-106, T-112 | Sección «Trama en tu móvil», diálogo «App no disponible» y teléfono realista con captura de la tienda | SPEC-005 Enm. 3 |
| T-107 | Menú desplegable del icono de usuario | SPEC-005 Enm. 1 |
| T-108 | Contador de unidades en el icono de la cesta (invitado y cuenta) | SPEC-005 Enm. 2 |
| T-109 | Franja de envío gratis con icono, título y subtítulo | SPEC-001 Enm. 43 |
| T-110 | Fondo degradado sutil en la newsletter | SPEC-001 Enm. 44 |
| T-111 | Sin palabras ni datos repetidos entre la franja de envío y «Compra con tranquilidad» | SPEC-001 Enm. 45 |

Decisiones de la spec (DP-1 a DP-10) en `SPEC-005 § Decisiones adoptadas`. Fuera de esta fase por decisión del usuario: puntos y referidos funcionales (DP-4/5), borrar la cuenta (DP-9).

## Estado verificado al cierre

- `main` = `origin/main` (`ba609a7`), árbol limpio.
- Puertas de cada tarea pasadas y documentadas en su review (typecheck, lint, check-palette, unitarios, e2e en Chromium y móvil, `test:a11y`, build, `audit:gate`, gitleaks). Último total de unitarios: 721 (65 ficheros).
- Cambios en `trama-dev` (BD compartida con la web pública): migración `20261024000000_favorites.sql` y seed `supabase/seed/catalog-new-flags.sql`, ambos aplicados con permiso expreso del usuario. Los tests de integración y e2e crean y borran sus propios datos de prueba.
- CI de GitHub: pasa sin e2e (ADR-013); el e2e solo se corre en local con `E2E_PORT=3200`.

## Pendiente (nada de esto se ha empezado)

1. **Test intermitente** `tests/unit/lint-invariants.test.ts › rechaza any explícito`: timeout de 5 s al lanzar ESLint con la máquina cargada; aislado pasa. Subirle el `timeout`.
2. **Deuda de UI anotada en las reviews:**
   - Barra fija de la ficha a 320 px: el nombre queda muy truncado y «Añadir al carrito» pasa a dos líneas.
   - `tests/responsive.spec.ts` solo recorre la portada y `/ofertas`: añadir `/buscar`, `/cuenta` y `/cuenta/favoritos`.
   - El banner de `/ofertas` usa un valor arbitrario de Tailwind (`object-[50%_30%]`) que la regla de estilos prohíbe.
   - La lógica de foco/Esc de los modales está copiada tres veces (PromoModal, AuthModal, MobileAppSection): extraer un hook.
   - Faltan capturas a 375 px de `/cuenta/favoritos` y de otras pantallas (los barridos de anchos sí pasan).
3. **Contador de la cesta:** con sesión hace una consulta ligera en cada cambio de ruta; si pesara, limitarlo con una señal de sesión en el cliente.
4. **Entradas del menú de usuario:** solo las cuatro pedidas; «Mis favoritos» y «Recomienda y gana» están únicamente en la barra de `/cuenta` (decisión a confirmar).
5. **Promesas de ejemplo** de «Compra con tranquilidad» (24-48 h, devolución gratuita, reembolso en 5 días) declaradas en SPEC-001 Enm. 28: VERIFICAR si la tienda pasara a vender de verdad.
6. **Dependabot:** quedan ramas abiertas en el remoto (dependencias npm y alguna acción) sin integrar; las trata otra sesión.
7. **Captura del teléfono** (`hero-app-pantalla`): es una instantánea de la portada de hoy; repetirla si cambia el diseño. El original está en `public/images/raw/` (fuera de Git).
8. **Comprobación a mano de la web pública** (`https://trama-ashy.vercel.app`) tras el despliegue: `/ofertas`, `/cuenta`, modal y menú de usuario, contador, sección «Trama en tu móvil».

## Cómo seguir en un chat nuevo

- Leer `CLAUDE.md`, `.claude/rules/` y la memoria del proyecto (sobre todo «Despliegue de Trama» y las notas de feedback).
- Spec-first: toda mejora nueva necesita enmienda y tarea antes de tocar código (T-113 es el siguiente ID libre; la siguiente enmienda de SPEC-001 es la 46 y la de SPEC-005 la 4).
- Una tarea por commit; no hacer push salvo que se pida; tests e2e con `E2E_PORT=3200` y de uno en uno.
