---
description: Ejecuta las puertas de calidad que aplican a la tarea actual.
---

Vas a ejecutar las puertas de calidad de rules/quality-gates.md que
apliquen según el nivel del proyecto y la tarea en curso.

1. Identifica la tarea activa. Determina el nivel (S/M/L) desde
   sdd/plans/.

   Antes de lanzar los tests de UI (responsive, a11y), analiza el cambio
   actual (puedes mirar el git diff o la tarea):
   1. Si el cambio es puramente lógico o de base de datos: lanza las
      puertas de UI habituales.
   2. Si el cambio es puramente cosmético (solo texto, color, o añadir
      un icono sin alterar padding/márgenes): puedes omitir el test
      responsive para ahorrar tiempo, pero SÍ debes pasar typecheck, lint
      y a11y.
   3. Si el cambio altera layout, espaciado (márgenes, padding) o
      estructura: ES OBLIGATORIO lanzar responsive.spec.ts y la captura
      a 375 px.

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
   pnpm exec playwright test tests/responsive.spec.ts   (todos los niveles, S incluido; se omite solo en cambios puramente cosméticos, ver arriba)

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
