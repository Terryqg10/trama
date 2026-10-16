---
id: ADR-005
title: Filtros del catálogo con columna lateral y progressive enhancement
status: aceptada
date: 2026-10-16
os_version: 0.3.0
relates_to: [SPEC-002-filtros-catalogo]
---

# ADR-005 — Filtros del catálogo con columna lateral y progressive enhancement

## Contexto

El filtro actual del catálogo (CatalogFilters.tsx) es un panel <details>
encima del catálogo, con chips que requieren pulsar "Aplicar filtros"
para aplicarse. Rompe la convención del sector e-commerce (Zalando,
Scalpers, ASOS, Mango: columna lateral izquierda en escritorio, drawer
en móvil, chips que aplican al clic) y añade fricción innecesaria.

El OS 0.3.0 introdujo `rules/ui-decisions.md` y la sección
`Decisiones de UI` en `plans/_template.md`. Este ADR documenta la
decisión de alinearse con la convención y cómo.

## Alternativas consideradas

1. **Cliente React puro** (chips con estado local, sin form nativo).
   UX moderna pero rompe sin JS y pierde indexabilidad.

2. **Form nativo puro** (como ahora). Funciona sin JS, pero requiere
   pulsar "Aplicar" para todo. Rompe la convención.

3. **Form nativo con progressive enhancement**: el form funciona sin JS;
   con JS, un pequeño componente cliente intercepta los clics en los
   chips y hace submit automático. Los campos de rango siguen
   requiriendo "Aplicar".

4. **Server actions de Next.js**. Moderno, tipado, sin recargas. Pero
   acopla el filtro a Next, rompe degradación sin JS, y no escala si
   algún día el catálogo se sirve estático.

## Decisión

Opción 3: form nativo con progressive enhancement.

- `CatalogFilters` sigue siendo un **server component** con un `<form
  method="get">`.
- Un componente cliente pequeño, `FilterChips`, escucha el `onChange` de
  los chips (que son `<input type="radio">` o `<input type="checkbox">`
  estilizados como chips) y hace `form.requestSubmit()` sin recargar.
- Los campos de precio usan `<input type="number">` y solo aplican al
  pulsar "Aplicar" (o al pulsar Enter).
- Sin JS: todo funciona, el usuario pulsa "Aplicar" después de
  cualquier cambio.

## Consecuencias

**Positivas:**
- Funciona sin JS (degradación real, no decorativa).
- Cumple la convención del sector (chips aplican al clic).
- Indexable (los filtros están en la URL, accesibles a crawlers).
- Sin dependencia de Next para el comportamiento base.

**Negativas:**
- Un componente cliente adicional (aunque pequeño).
- Los campos de rango siguen requiriendo "Aplicar", lo cual es
  coherente pero puede confundir al principio.

## Relación con la constitución

No toca invariantes. No cambia defaults. Se documenta bajo la regla del
OS 0.3.0 (`rules/ui-decisions.md`): es una decisión de UI que ahora
sigue la convención del sector, y queda registrada.
