# rules/constitution.md

La constitución vive en `docs/constitution.md`. Esta regla es el
recordatorio operativo: la lista corta que debes tener presente y los
punteros exactos.

## Invariantes (no se saltan)

| ID | Regla |
|---|---|
| I1 | Spec-first: sin spec aprobada, no hay código. |
| I2 | TypeScript estricto: prohibido any, @ts-ignore, as unknown as. |
| I3 | RLS antes de consumir datos; prueba de aislamiento entre usuarios. |
| I4 | Secretos fuera del repo; .env* en .gitignore; gitleaks; deny en settings.json. |
| I5 | Inputs externos validados con Zod; tipos derivados del esquema. |
| I6 | WCAG AA como suelo; foco visible; 44×44 px táctil; texto ≥ 12 px. |
| I7 | prefers-reduced-motion con alternativa estática; sin scroll-jacking. |
| I8 | Scripts cross-platform (Node/TS). Nada de sh/bash. |
| I9 | Trazabilidad RF → CA → T → test; DoD con evidencia, no con afirmaciones. |

## Defaults (sobrescribibles con ADR)

Next.js App Router, Postgres, pnpm, Vitest+TL+Playwright, lucide-react,
Geist, Motion, Vercel, GitHub Actions, v2 nivel L1, modo oscuro por estilo.

## Cómo actuar

1. Antes de escribir código, comprueba que la spec y la tarea existen y están aprobadas.
2. Si algo choca con un invariante, detente y propón: cambiar el proyecto o enmienda a la constitución.
3. Para cambiar un default, /decide y listo.
4. Nunca edites docs/constitution.md desde un proyecto.

## Diferencias con el OS

Un estilo aprobado no se edita: los cambios crean una versión nueva. Los
ADRs ya aceptados tampoco se editan.
