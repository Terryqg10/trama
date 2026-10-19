---
description: Ejecuta las puertas de calidad que aplican a la tarea actual.
---

Vas a ejecutar las puertas de calidad de rules/quality-gates.md que
apliquen según el nivel del proyecto y la tarea en curso.

1. Identifica la tarea activa. Determina el nivel (S/M/L) desde
   sdd/plans/.

2. Ejecuta una por una y pega la salida (no un resumen).

   Obligatorias siempre:
   pnpm tsc --noEmit
   pnpm lint
   pnpm build

   Si hay base de datos y se tocaron datos:
   pnpm test:rls

   Si se tocó UI:
   pnpm check-palette
   pnpm test:a11y
   pnpm exec playwright test tests/responsive.spec.ts   (aplica a TODOS los niveles, S incluido)

   Según el nivel:
   - S: Lighthouse (rendimiento y accesibilidad ≥ 90).
   - M: pnpm test + pnpm test:e2e.
   - L: tests de integración contra base de datos real.

   Seguridad:
   pnpm audit --audit-level=high
   pnpm dlx gitleaks detect --no-banner

3. Informa en una tabla:

   | Puerta | Comando | Resultado | Bloquea |
   |---|---|---|---|
   | 1 tsc | pnpm tsc --noEmit | ✅/❌ | sí |

4. Si algo falla:
   - No propongas cerrar la tarea.
   - Anota el fallo.
   - Propón la corrección mínima.

5. Si todo pasa, sugiere /review.
