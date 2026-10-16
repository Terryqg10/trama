---
id: T-XXX
title: <título corto>
spec: SPEC-XXX-<slug>
plan: PLAN-XXX-<slug>
ca_cubiertos: [CA-01]
rigor_level: S | M | L
status: pendiente
created: YYYY-MM-DD
updated: YYYY-MM-DD
depends_on: []
---

# T-XXX — <título>

## Contexto

## Cambio previsto

## Fuera de alcance de esta tarea

## Criterios de aceptación

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-01 | ... | ... | ... |

## Puertas que aplican

- [ ] tsc --noEmit
- [ ] lint
- [ ] build
- [ ] audit --audit-level=high
- [ ] gitleaks detect
- [ ] RLS isolation (si DB)
- [ ] check-palette (si UI)
- [ ] test:a11y (si UI)
- [ ] Lighthouse (nivel S, si UI)
- [ ] tests unitarios (nivel M, L)
- [ ] test e2e del flujo principal (nivel M, L)
- [ ] tests de integración con DB real (nivel L)
- [ ] CI bloqueante (nivel L)

## Evidencia esperada
