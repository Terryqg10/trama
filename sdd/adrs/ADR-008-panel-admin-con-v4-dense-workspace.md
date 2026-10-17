---
id: ADR-008
title: El panel de administración usa el estilo v4-dense-workspace; la tienda sigue en v1
status: aceptada
date: 2026-10-17
os_version: 0.3.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, ADR-004-roles-y-ajustes-desde-el-panel]
---

# ADR-008 — Panel admin con v4-dense-workspace

## Contexto

El proyecto usa `v1-soft-commerce@0.3.0` (píldoras, tarjetas, tipografía grande), pensado para tiendas y
catálogos. El panel de administración (T-021 a T-024) es otra superficie: lo usa quien gestiona la tienda
durante horas, con tablas de pedidos, productos y usuarios. Al empezar T-022, el usuario pidió que el panel
sea `v4-dense-workspace`, el estilo del sistema para herramientas internas, paneles y admin («la fila es la
unidad», sidebar y topbar, `grid-cols-12`). v4 está en estado `borrador-sin-referencias` (0.1.0), igual que v1
(`borrador 0.3.0`), y no se edita desde un proyecto.

El problema técnico: v1 y v4 declaran las mismas variables CSS de estructura (`--radius-control`,
`--text-sm`, `--layout-container`…) en un `@theme static` global. No se pueden importar los dos tal cual en
`globals.css`: el segundo pisaría al primero en toda la web, incluida la tienda.

## Alternativas consideradas

1. **Cambiar todo el proyecto a v4.** Rompe la identidad de tienda (píldoras, tarjetas) y obliga a revisar
   todos los componentes; v4 dice expresamente «no usarlo en tiendas».
2. **Usar v1 también en el panel** (lo que se había elegido primero). Coherente pero ajeno a la guía de v4
   para herramientas: tarjetas y botones píldora en tablas de datos, texto grande, poca densidad.
3. **v4 en la zona `/admin`, con sus valores de forma, tipografía y layout acotados a esa zona** mediante un
   atributo en el contenedor del panel, y la misma paleta (`palette.css`, aprobada) para las dos zonas.
   Dos estilos en un proyecto, cada uno donde corresponde. Coste: mantener una copia acotada de los valores de
   `tokens.css` de v4 hasta que el OS permita importarlos acotados.
4. **Segunda aplicación o subdominio para el admin.** Aísla del todo los estilos pero duplica el despliegue,
   la sesión y las dependencias; desproporcionado.

## Decisión

Opción 3. La tienda sigue en `v1-soft-commerce@0.3.0`. Todo lo que cuelga de `/admin` usa
`v4-dense-workspace@0.1.0`:

- `src/app/admin/admin-theme.css` redeclara, bajo `[data-style="v4"]`, los tokens estructurales de v4
  (`--radius-*`, `--text-*`, `--shadow-*`, layout y movimiento) con los mismos nombres y valores que
  `design/styles/v4-dense-workspace/tokens.css`. Los componentes del panel solo consumen nombres de token
  (`rounded-control`, `text-sm`…), igual que en la tienda: en la zona v4 resuelven a los valores de v4.
- El color sigue viniendo de `palette.css` (14 tokens, aprobada por el usuario): v4 tiene `colors:
  por-proyecto`, así que no hay paleta nueva y `check-palette` sigue siendo válido.
- La cabecera y el pie de la tienda no se muestran en `/admin`: v4 lleva el logo en la sidebar y la navegación
  en sidebar y topbar. El panel tiene su propio `main`.
- La evidencia de CA-S1 a CA-S18 de v4 que apliquen va en la review de cada tarea del panel.

## Consecuencias

Positivas:
- El panel sigue la guía de v4: filas `grid-cols-12`, sidebar, topbar con búsqueda (`Ctrl+K`), badges de
  estado con icono y texto, números tabulares, controles de 36 px en escritorio y 44 px en móvil.
- La tienda no cambia: la zona v4 no deja ninguna variable en `:root`.
- Reversible: borrar `admin-theme.css` y el atributo devuelve el panel al estilo de la tienda.

Negativas:
- Hay una copia de los valores de `tokens.css` de v4 en `admin-theme.css`. Si v4 cambia de versión (un estilo
  aprobado crea una versión nueva, no se edita), hay que actualizar la copia a mano y la versión citada.
- Usa un estilo en `borrador-sin-referencias`: las decisiones de forma de v4 no tienen capturas de referencia.
- Dos estilos en un proyecto exigen que la documentación y las reviews digan siempre a qué zona se refieren.

## Relación con la constitución

- I6 (WCAG AA como suelo, 44×44 táctil, texto ≥ 12 px) y I7 (`prefers-reduced-motion`): v4 los cumple y se
  verifican con axe y e2e en el panel.
- Las reglas de `rules/styles.md` (solo nombres de token, sin hex ni valores arbitrarios) se mantienen.
- «Un estilo aprobado no se edita»: no se edita ningún archivo de `design/styles/`; la copia vive en el
  proyecto y cita la versión de origen.
