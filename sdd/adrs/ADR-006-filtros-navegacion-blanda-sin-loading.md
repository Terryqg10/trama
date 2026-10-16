---
id: ADR-006
title: Filtros con navegación blanda y catálogo sin loading.tsx para funcionar sin JavaScript
status: aceptada
date: 2026-10-16
os_version: 0.3.0
relates_to: [SPEC-001-trama-tienda, SPEC-002-filtros-catalogo, ADR-005]
---

# ADR-006 — Navegación blanda en filtros y catálogo sin `loading.tsx`

## Contexto

Al planificar T-008 (chips que se aplican al clic) aparecen dos problemas que
ADR-005 no resolvía:

1. ADR-005 dice que `FilterChips` hace `form.requestSubmit()` "sin recargar".
   Un envío GET nativo es una navegación completa: recarga el documento. CA-03
   de SPEC-002 exige que el catálogo se filtre **sin recargar**.
2. Con JavaScript desactivado, el listado se queda en el esqueleto de carga:
   `loading.tsx` envuelve la página en un límite de Suspense y Next sustituye el
   esqueleto por el contenido con un script. T-005 ya lo había detectado y el
   usuario decidió entonces mantener el esqueleto (SPEC-001 §6). RF-07 y CA-07
   de SPEC-002 exigen ahora que el filtro funcione sin JavaScript, y eso no es
   compatible con un esqueleto de streaming.

## Alternativas consideradas

1. **`requestSubmit()` tal cual (ADR-005).** Simple, pero recarga el documento:
   incumple CA-03.
2. **Navegación blanda con `router.push` desde un componente cliente.** Sin
   recarga, mantiene el foco y el scroll, y el formulario sigue siendo GET sin JS.
3. **Mantener `loading.tsx`** y aceptar que sin JS no hay catálogo. Enmienda de
   RF-07/CA-07: contradice el objetivo de degradación real.
4. **Mantener `loading.tsx` y forzar el contenido con CSS en `<noscript>`.**
   Depende de ids internos de Next (`S:n`); frágil entre versiones.
5. **Quitar `loading.tsx`.** El HTML llega completo y funciona sin JS. Se pierde
   el esqueleto al llegar al catálogo desde el menú.

## Decisión

- Opción 2 para el comportamiento con JS: `FilterChips` (componente cliente) envuelve
  el `<form method="get">` renderizado en servidor. Al cambiar un chip (radio) o enviar
  el formulario construye la URL con los campos no vacíos y llama a `router.push`
  (sin recarga, sin saltar el scroll). Los campos de precio solo aplican con
  «Aplicar filtros» o Enter. Tras cada cambio de URL sincroniza los controles con
  los parámetros (para que «Limpiar» o «Atrás» se reflejen sin perder el foco).
- Opción 5 para el resto: se elimina `src/app/(catalog)/loading.tsx` y
  `CatalogSkeleton`. El estado «Cargando» del catálogo pasa a ser `aria-busy` y
  una atenuación del formulario mientras dura la transición de filtrado.

Esto sustituye la decisión de T-005 de mantener el esqueleto (SPEC-001 §6, fila
Catálogo, columna Cargando), registrada en la Enmienda 5 de SPEC-001.

## Consecuencias

Positivas:
- Con y sin JavaScript el catálogo se ve y se filtra (CA-03 y CA-07).
- Sin recarga completa al pulsar un chip (CA-03); foco y scroll se conservan.
- Menos código: se elimina el esqueleto y su test.

Negativas:
- Al entrar al catálogo desde el menú no hay esqueleto: la página aparece cuando el
  servidor responde.
- El componente cliente añade JavaScript al listado (pequeño).
- Reversible: restaurar `loading.tsx` devuelve el esqueleto pero rompe CA-07.

## Relación con la constitución

No toca invariantes. Respeta I6 (foco visible, WCAG AA) e I7 (sin animaciones
nuevas). Los parámetros siguen validándose con Zod en el servidor
(`parseCatalogParams`); el cliente solo los compone.
