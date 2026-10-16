---
id: ADR-001
title: Aceptar temporalmente la vulnerabilidad de braces (sin parche) hasta 2026-11-11
status: aceptada
date: 2026-10-12
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, T-001]
expires: 2026-11-11
---

# ADR-001 — Aceptar temporalmente la vulnerabilidad de `braces`

## Contexto

`pnpm audit --audit-level=high` reporta una vulnerabilidad alta en
`braces <=3.0.3` (denegación de servicio por agotamiento de pila,
GHSA-vfj7-8cjw-p6xm). La versión parcheada figura como `<0.0.0`, es decir,
no existe corrección publicada. Llega por la ruta
`eslint-config-next@16.4.0 > @next/eslint-plugin-next > fast-glob > micromatch > braces`.

La puerta 5 de `rules/quality-gates.md` exige `audit` sin hallazgos altos
"o con ADR y caducidad". Antes de este ADR se resolvieron con actualización
las 3 críticas y 1 alta restantes (vitest 5, vite 8, plugin-react 6).

## Alternativas consideradas

1. **Aceptar con caducidad (30 días) y revisar cuando haya parche** —
   sin cambios en el código. Deja un hallazgo abierto, acotado en el tiempo.
2. **Forzar otra versión con `pnpm.overrides` (`braces` o `micromatch`)** —
   no existe versión corregida de `braces`; forzar un `micromatch` distinto
   puede romper `fast-glob` y el lint.
3. **Quitar `eslint-config-next` y configurar ESLint a mano** — elimina la
   ruta, pero pierde las reglas oficiales de Next y añade mantenimiento sin
   necesidad.

## Decisión

Se elige la alternativa 1. Se acepta el hallazgo de `braces` hasta el
**2026-11-11** (30 días). Antes de esa fecha, o si aparece una versión
parcheada, se ejecuta `pnpm update`, se repite `pnpm audit` y se retira la
excepción. Si a la fecha sigue sin parche, se reevalúa con un ADR nuevo
(este no se edita).

Motivos: la dependencia es solo de desarrollo (lint), no entra en el
bundle ni en producción, y los patrones glob que procesa los escribimos
nosotros, no los controla un atacante externo.

## Consecuencias

Positivas:
- Se desbloquea la puerta 5 de T-001 sin tocar código ni perder el lint de Next.
- Revertir es barato: `pnpm update` y borrar la excepción.

Negativas:
- `pnpm audit` seguirá mostrando 1 alta (y 1 moderada) hasta que haya parche.
  El CI futuro (T-002) debe permitir esta excepción solo hasta la caducidad.
- Exige acordarse de la fecha límite.

## Relación con la constitución

- I4/seguridad y puerta 5 de calidad: cumple la vía "con ADR y caducidad".
- No altera invariantes. No cambia la spec aprobada, por lo que no hay enmienda.
