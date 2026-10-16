---
id: constitution
version: 0.1.0
os_version: 0.1.0
updated: 2026-10-10
---

# Constitución de web-os

Esta constitución rige todos los proyectos instanciados desde el OS
web-os. Es el contrato de mínimos que un proyecto no puede incumplir.
Tiene dos capas: invariantes (no se tocan sin enmienda) y defaults (se
cambian con ADR sin enmienda).

## 1. Alcance y jerarquía

- Aplica a cada proyecto instanciado con Copier desde web-os.
- El OS puede evolucionar sin cambiar la constitución si no hay enmienda.
- Si un proyecto necesita incumplir un invariante, no puede: se enmienda
  la constitución o se cambia el proyecto.
- Si un proyecto quiere cambiar un default, lo hace con un ADR propio.

## 2. Invariantes

Un invariante es una regla que ningún proyecto puede saltarse sin
enmienda a esta constitución.

### I1 — Spec-first
Nada se implementa sin spec aprobada. Las tareas derivan de la spec.

### I2 — TypeScript estricto
Sin `any`, sin `@ts-ignore`, sin `as unknown as`.

### I3 — RLS antes de consumir datos
Si el proyecto tiene base de datos con usuarios, las políticas de Row
Level Security se definen antes de escribir el primer consumidor. Requiere
prueba de aislamiento entre usuarios.

### I4 — Secretos fuera del repositorio
Ninguna clave, token o credencial en el repo. `.env*` en `.gitignore`.
`.env.example` documenta variables sin valores reales. `gitleaks` en
pre-commit. Claude Code tiene `permissions.deny` sobre `.env*`.

### I5 — Validación en el límite
Todo input externo se valida con Zod antes de usarse. Los tipos de
TypeScript se derivan del esquema de Zod.

### I6 — WCAG AA como suelo
Contraste 4.5:1 (texto normal) y 3:1 (UI) como mínimo. Foco visible.
Objetivos táctiles ≥ 44×44 px. Texto ≥ 12 px. `axe` sin violaciones
graves.

### I7 — Movimiento respetuoso
`prefers-reduced-motion` se respeta con alternativa estática. Sin
scroll-jacking. Animar solo `transform` y `opacity`.

### I8 — Cross-platform
Los scripts del OS y del proyecto funcionan en Windows, macOS y Linux
sin dependencias duras de `sh`/`bash`.

### I9 — Trazabilidad y DoD con evidencia
IDs de trazabilidad `RF-xx → CA-xx → T-xx → test`. Cada CA tiene test o
comprobación manual documentada. Una tarea no se cierra con una
afirmación: se cierra con evidencia.

## 3. Defaults sobrescribibles con ADR

| ID | Default | Notas |
|---|---|---|
| D1 | Next.js App Router | RSC por defecto. `'use client'` solo donde hay interacción. |
| D2 | Postgres | Proveedor por proyecto con ADR. SQLite solo en herramientas locales. |
| D3 | pnpm | Estricto con dependencias no declaradas. |
| D4 | Vitest + Testing Library + Playwright | Unit + componente + e2e. |
| D5 | `lucide-react` | Iconos. |
| D6 | Geist vía `next/font` | Se inyecta en `--font-brand`. |
| D7 | Motion | Antes Framer Motion. |
| D8 | Vercel | Deploy por defecto. Alternativa con ADR. |
| D9 | GitHub Actions | CI mínima: typecheck, lint, tests, build. |
| D10 | v2: nivel L1 | Capas de imagen + Motion. L2/L3 con ADR. |
| D11 | Modo oscuro por estilo | v1 no lo trae; v3 nace oscuro. |

## 4. Proceso de enmienda

- MAJOR del OS: añadir, eliminar o modificar un invariante. Exige ADR.
- MINOR: añadir un invariante sin invalidar proyectos, o cambiar
  defaults. Exige ADR.
- PATCH: aclaraciones sin cambio semántico.

Un proyecto no puede enmendar la constitución.

## 5. Niveles de rigor S/M/L

- S (landing): puertas 1-5, 7, 8, 10 + Lighthouse ≥ 90.
- M (web/herramienta): S + tests unitarios de negocio + un e2e del flujo
  principal.
- L (SaaS): M + tests de integración con DB real + CI bloqueante + ADR
  por decisión nueva.

## 6. Documentos hermanos

- `docs/sdd.md` — flujo SDD.
- `docs/quality-gates.md` — las 10 puertas.
- `docs/rigor-levels.md` — S/M/L.
- `design/styles/index.md` — registro de estilos.
- `CLAUDE.md` — reglas operativas de Claude Code.

## 7. Versionado

Esta constitución sigue el versionado del OS. Está en 0.1.0 al crear el
OS. Cada cambio se anota en el CHANGELOG.md del OS.