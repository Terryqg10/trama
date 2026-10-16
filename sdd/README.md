# sdd/ — Spec-Driven Development

Flujo: spec → plan → tasks → implement → review.

Nada se implementa sin spec aprobada. Las tareas derivan de la spec. La
review cierra con evidencia, no con afirmaciones.

## Niveles de rigor

- S (landing): ceremonia mínima.
- M (web/herramienta): spec y plan completos. Tests unitarios + un e2e.
- L (SaaS): M + tests de integración con DB real + CI bloqueante + ADR.

El nivel se declara en sdd/plans/ y no se cambia sin ADR.

## IDs

- SPEC-001-<slug> — spec. Número global.
- RF-01, RF-02, … — requisitos funcionales. Locales.
- CA-01, CA-02, … — criterios de aceptación. Locales.
- PLAN-001-<slug> — plan. Mismo número que su spec.
- T-001, T-002, … — tareas. Número global.
- ADR-001, ADR-002, … — decisiones. Número global.
- EXP-001-<slug> — exploraciones. Número global.
- reviews/T-001.md — review. Mismo nombre que la tarea.

## Reglas

1. Una spec aprobada no se edita: se enmienda con /decide.
2. Una tarea es atómica.
3. Cada CA se verifica con un test o comprobación manual.
4. Una tarea no se cierra sin /check y /review.
5. Los ADRs solo para decisiones con alternativas reales.
6. Las exploraciones son desechables.
