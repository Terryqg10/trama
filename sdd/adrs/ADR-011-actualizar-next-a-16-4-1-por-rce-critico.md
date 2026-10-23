---
id: ADR-011
title: Actualización de seguridad de Next.js a 16.4.1 por RCE crítico
status: aceptada
date: 2026-10-23
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, T-086]
---

# ADR-011 — Actualización de seguridad de Next.js a 16.4.1

## Contexto

`pnpm audit:gate` bloquea con 3 hallazgos en `next@16.4.0` (dependencia de producción):

| GHSA | Severidad | Descripción | Afectado | Parcheada |
|---|---|---|---|---|
| GHSA-2464-fhr4-w9xw | crítica | RCE sin autenticar en la API de optimización de imágenes con SVG | >=16.0.0 <=16.4.0 | >=16.4.1 |
| GHSA-673q-mjm6-r5xr | crítica | RCE sin autenticar en funciones `use cache` que devuelven typed arrays | >=16.0.0 <=16.4.0 | >=16.4.1 |
| GHSA-p3m5-59mp-jv5r | alta | DoS en App Router con Server Actions (CVE-2026-94482) | >=16.0.0 <=16.4.0 | >=16.4.1 |

Además, `next build` aborta con `SecurityFatalError` y impide el build de producción y el e2e.
La tienda está desplegada en Vercel, por lo que la exposición es real.

## Alternativas consideradas

1. **Actualizar a 16.4.1 (patch, mismo rango `^16.0.0`)** — corrige los tres avisos; cambio mínimo.
2. **Aceptar el riesgo con ADR y caducidad (como ADR-001)** — descartada: son RCE sin autenticar en producción; la vía de excepción de la puerta 5 no es razonable aquí.
3. **Mitigar sin actualizar (desactivar SVG en imágenes, evitar `use cache`)** — deja la dependencia vulnerable y no cubre el DoS ni el build.

## Decisión

Alternativa 1: `pnpm update next@16.4.1`. Sin cambios de código. `pnpm update next@16.4.1` sube el mínimo en `package.json` a `^16.4.1` y cambia el lockfile.

## Consecuencias

Positivas: se cierran los 3 hallazgos y el build vuelve a funcionar.
Negativas / riesgos: un patch puede introducir regresiones; se cubre con las 10 puertas y el e2e completo (T-086).
Reversible: revertir el commit del lockfile.

## Relación con la constitución

Puerta 5 de `rules/quality-gates.md` y `rules/security.md` (dependencias). No altera invariantes ni la spec.
