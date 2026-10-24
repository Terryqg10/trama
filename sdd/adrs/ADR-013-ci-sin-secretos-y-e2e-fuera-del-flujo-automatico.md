---
id: ADR-013
title: La CI no usa secretos: el e2e sale del flujo automático y se ejecuta en local
status: aceptada
date: 2026-10-24
os_version: 0.1.0
relates_to: [SPEC-004-integracion-continua, PLAN-001-trama-tienda, T-097, ADR-002]
---

# ADR-013 — La CI no usa secretos: el e2e sale del flujo automático

## Contexto

`.github/workflows/ci.yml` no ha pasado nunca (44 ejecuciones, 0 verdes, a 2026-10-24). El primer fallo es el paso `Build`: `next build`
prerenderiza `/admin` y `/carrito`, `parsePublicSupabaseEnv` exige `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el workflow no
las define. Detrás está el paso e2e, que arranca la tienda con `pnpm run build && pnpm run start` y habla con la base de datos en la nube y con
Stripe (claves `pk_test_`/`sk_test_`/`whsec_` que `env.ts` exige): el proyecto de Supabase `trama-dev` es único y lo usa también la web pública
(Enmienda 41). Mientras tanto, los 8 PRs de Dependabot están en rojo por esta causa y no por sus cambios.

## Alternativas consideradas

1. **Sin secretos; e2e fuera del flujo automático** — la CI bloquea con typecheck, lint, palette, audit, unitarios y build (valores ficticios);
   el e2e se ejecuta en local con su salida en la review. No hay claves en GitHub ni riesgo para la base compartida; se pierde el e2e automático.
2. **CI completa con secrets de `trama-dev` y Stripe test** — e2e automático, pero cada push escribe en la base que sirve la web (pisa stock y
   datos de la demo), los PRs de Dependabot no reciben secrets y seguirían en rojo, y exige guardar claves en GitHub.
3. **Solo arreglar Build** — descartada: el paso e2e seguiría fallando y la CI seguiría en rojo.

## Decisión

Alternativa 1. El workflow define valores ficticios (no secretos) solo donde el build los necesita, y deja de ejecutar `playwright install`,
`test:e2e` y la subida del informe. El e2e sigue siendo puerta de cierre de tarea (puerta 7), con evidencia local (`E2E_PORT=3200`).

## Consecuencias

Positivas:
- La CI puede volver a estar en verde y a ser bloqueante; los PRs de Dependabot se pueden evaluar por su CI.
- Ninguna clave en GitHub.

Negativas:
- Una regresión de e2e (incluido `tests/responsive.spec.ts`) no la detecta la CI; solo la ejecución local antes de cerrar.
- El build de CI no prueba que las variables reales sean correctas.

Reversible: sí. Si hay una base de datos de pruebas aislada de la web, se reabre con otro ADR y se reincorpora el e2e.

## Relación con la constitución

Respeta I4 (sin secretos en el repo) y mantiene «CI bloqueante» (nivel L). Apartarse del e2e en CI se registra aquí; I9 se cumple con la evidencia
local de cada review. ADR-002 (base separada de cualquier uso real) sigue incumplido por la Enmienda 41, y es la razón de fondo por la que el e2e no
puede ir a la CI.
