# CLAUDE.md — Instrucciones para Claude Code

Este proyecto sigue el OS web-os. Esta es la guía de trabajo. Si algo de
aquí contradice al usuario, gana el usuario; pero no saltes un invariante
sin pedir enmienda a la constitución.

## Qué es este proyecto

Un proyecto instanciado desde web-os. Trabajamos con Spec-Driven
Development (SDD): spec → plan → tasks → implement → review. Nada se
implementa sin spec aprobada.

## Reglas no negociables (invariantes)

Están en `docs/constitution.md`. Resumen:

1. Spec-first. Sin spec aprobada, no hay código.
2. TypeScript estricto. Sin any, sin @ts-ignore.
3. RLS antes de consumir datos si hay base de datos con usuarios.
4. Secretos fuera del repo. Nunca leas ni escribas .env*.
5. Validación con Zod en todo input externo.
6. WCAG AA como suelo, no como meta.
7. prefers-reduced-motion con alternativa estática.
8. Scripts cross-platform (Windows incluido). Nada de sh/bash.
9. Trazabilidad y evidencia. Cada CA tiene test o comprobación
   documentada. Nada se cierra "porque funciona".

Detalle en `.claude/rules/constitution.md`.

## Regla de la UI (crítica)

Antes de crear o modificar cualquier UI:

1. Lee `design/styles/index.md`.
2. Pregunta al usuario con qué estilo empezar. La primera opción es el
   estilo actual (`style: vX@versión` en `sdd/plans/`), marcada
   "(actual)". Incluye siempre "Nueva exploración".
3. Confirma que el proyecto tiene un `palette.css` válido. Si no, aplica
   `design/styles/vX-…/palette-rules.md` antes.
4. Usa solo nombres de token. Prohibido hex, rgb() o valores arbitrarios
   en componentes.
5. Responsive: antes de cerrar cualquier tarea de UI, comprueba que
   funciona en todo el rango de 320 a 1280 px, incluidos anchos
   intermedios (480-700 px). Sin scroll horizontal, sin elementos
   cortados, con navegación móvil definida. El test
   `tests/responsive.spec.ts` (barrido de 18 anchos) lo verifica
   automáticamente; si falla, se arregla la causa, no el test.

Detalle en `.claude/rules/styles.md`.

## Flujo de trabajo

| Paso | Comando | Qué hace |
|---|---|---|
| 0 | /empezar | Proyecto recién instanciado: guía paso a paso hasta la primera spec, plan y tarea. |
| 1 | /start | Lee el estado del proyecto y dice qué toca. |
| 2 | /new-spec | Crea una spec nueva desde plantilla. |
| 3 | /new-task | Crea una tarea desde una spec, con sus CA. |
| 4 | (trabajo) | Implementa la tarea. |
| 5 | /check | Corre las puertas de calidad de la tarea. |
| 6 | /review | Cierra la tarea rellenando review.md con evidencia. |
| — | /decide | Cuando aparece una decisión con alternativas reales. |
| — | /style | Consulta o cambia el estilo del proyecto. |
| — | /competencia | Investiga la competencia y la convierte en ADR, spec y tareas. |
| — | /brain | Ejecuta el pipeline autónomo completo (Plan -> Build -> Auditar -> Pulir -> Tests). |
| — | /auditar-pagina | Compara la página actual con las checklists y añade los bloques que falten. |
| — | /pulir-ui | Aplica el Craft Floor y eleva la calidad visual (espaciado, tipografía, tokens). |
| — | /sincronizar | Actualiza el proyecto con la última versión del OS vía Copier. |

> Si el proyecto acaba de instanciarse y no hay specs todavía, el primer
> comando es `/empezar`, no `/start`.

Regla de oro: una tarea atómica por sesión. No mezcles capas. No cierres
si alguna puerta falla.

## Estructura del repo

- `docs/constitution.md` — invariantes y defaults.
- `design/styles/` — estilos versionados (v1…v4) + registro.
- `sdd/` — specs, plans, tasks, adrs, explorations, reviews.
- `src/` — código de Next.js (App Router).
- `review.md` — plantilla de cierre (una por tarea, en sdd/reviews/).
- `.claude/` — esto: CLAUDE.md, rules/, commands/, agents/, settings.json.

## Cómo hablas

- Conciso. Tablas cuando ayuden. Nada de relleno.
- Si falta información, no asumas: termina con DECISIONES PENDIENTES
  (opciones + trade-off).
- Lo dudoso se marca VERIFICAR. Nunca inventes versiones, precios o
  términos legales.
- Separa decisiones del OS y decisiones del proyecto. Nunca mezclar.
- No uses "por simplicidad" como justificación. Si una decisión se
  aparta de la convención del sector, se documenta en el plan. La
  simplicidad no es una excusa; el criterio sí.

## Reglas detalladas

- `rules/constitution.md` — invariantes y defaults.
- `rules/spec-first.md` — flujo SDD y trazabilidad.
- `rules/styles.md` — estilos, tokens, paleta.
- `rules/quality-gates.md` — puertas de calidad y niveles S/M/L.
- `rules/security.md` — secretos, RLS, validación, dependencias.
- `rules/scripts.md` — cross-platform, Windows.
- `rules/ui-decisions.md` — convención del sector y cómo justificar
  apartarse de ella.
- `rules/process.md` — no te adelantes: pregunta si dudas, no hagas más
  de lo pedido, revisa antes de cada commit.

Léelas cuando la tarea las toque. No las repitas en la respuesta; cítalas.
