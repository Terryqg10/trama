---
id: v4-dense-workspace
name: Dense Workspace
version: 0.1.0
status: borrador-sin-referencias
surface: herramienta
layout: workspace-12col
mode: claro
colors: por-proyecto
references: estándares propios del usuario (sin capturas aportadas)
---

# v4 — Dense Workspace

## Identidad

Minimalismo de alta densidad. La unidad no es la tarjeta, es la fila. Los
contenedores principales usan `--radius-container`; todo lo demás tiene
radios pequeños. La jerarquía se construye con peso tipográfico, no con
color. El acento aparece solo en la acción principal. El espacio en
blanco separa, no las líneas ni los fondos tintados.

El usuario pasa horas dentro de la herramienta. El estilo está pensado
para eso: menos scroll, más contexto, menos clics.

## Cuándo usarlo / cuándo no

| Usarlo | No usarlo |
|---|---|
| Herramientas internas, admin, paneles | Tiendas, catálogos, apps de consumo (v1) |
| SaaS con muchas pantallas y datos | Landings con hero 3D y animación (v2) |
| Tablas, listas densas, editores, dashboards | Sitios editoriales oscuros a sangre (v3) |
| Cuando el usuario final es "el que usa", no "el que mira" | Cuando el titular es el mensaje |

## Principios

1. La fila es la unidad. `grid-cols-12`, filas compactas, información densa.
2. Jerarquía por peso tipográfico y espacio. No por color.
3. Un solo acento, solo en la acción principal. Los estados usan sus propios tokens (success, danger) con icono o texto.
4. Densidad sí, microscopía no: nada por debajo de `--text-min` (12 px).
5. Forma sobria: contenedores principales `--radius-container`; inputs y controles `--radius-control` (no píldora).
6. Sin imágenes grandes, sin héroes, sin animación decorativa.
7. El espacio en blanco separa. No hay que añadir líneas ni fondos tintados.
8. Todo control tiene acción. Cero enlaces muertos. El logo enlaza a `/`.

## Contrato de tokens

- Estructura (forma, elevación, tipografía, movimiento, layout) en `tokens.css`.
- Color: 14 tokens con nombre fijo en `palette.css`, según `design/palette-rules.md` (modo claro).
- Los componentes consumen solo nombres de token.

## Patrones de componentes

| Componente | Reglas |
|---|---|
| Sidebar (escritorio) | Ancho `--sidebar-width`. Logo arriba (enlaza a `/`). Navegación vertical, icono + etiqueta. El activo en `accent-text` con fondo `accent-soft`. `aria-current="page"`. |
| Topbar | Barra de `--topbar-height` con búsqueda, filtros, notificaciones, perfil. Sin logo (vive en sidebar). |
| Drawer móvil | Cuando no cabe el sidebar, se pliega en un drawer. Siempre cerrable (Esc + click fuera + botón). `aria-modal="true"`. |
| Contenedor de página | `--radius-container`. Fondo `surface`. Sin sombra o con `--shadow-card` mínima. Padding `--layout-gutter`. |
| Fila tabular | `grid-cols-12`. Altura `--row-height` (compact 40px / base 48px). Columna 1: checkbox o avatar. Columna 2-3: identidad. Columnas 4-10: datos. Columnas 11-12: acciones. Texto en `--text-sm`. Identidad en peso 500. |
| Cabecera de tabla | Fondo `surface-muted`, texto en `--text-xs` con `--tracking-tight`, peso 500, `fg-muted`. Sticky. |
| Input / selector | `--radius-control`. Borde `border-strong`. Texto `--text-sm`. Altura `--control-height` (36px). Foco con outline visible. |
| Botón primario | `--radius-control`, `accent` / `accent-fg`, hover `accent-hover`. Altura `--control-height` (36px). Peso 500. |
| Botón secundario | Contorno `border-strong`, fondo `surface`, texto `fg`. Sin relleno de color. |
| Botón de fila | Botones solo-icono en la columna de acciones. `aria-label` obligatorio. Zona táctil ≥ 44×44 en móvil; ≥ 32×32 en escritorio. |
| Badge de estado | `--radius-tile`, texto `--text-xs`. Icono o texto siempre. Nunca solo color. |
| Modal / Dialog | `--radius-container`. Máximo `--modal-max` (560px). Cerrable (Esc + click fuera + botón). `aria-modal="true"`. |
| Menú contextual | Items en `--text-sm`. Separador `border`. Sin animación de apertura más allá de `--duration-fast`. |
| Empty state | Icono neutro, título en peso 500, texto `fg-muted`, acción principal. Sin ilustraciones grandes. |
| Skeleton | Bloques `surface-muted` con forma del contenido real. Sin shimmer animado si `prefers-reduced-motion`. |

## Layout

- Escritorio: sidebar (`--sidebar-width`) + main. El main contiene filas de `grid-cols-12` con gap `--grid-gap`.
- Tablet: sidebar colapsable. Filas todavía en `grid-cols-12`.
- Móvil: sidebar en drawer. Las tablas se convierten en filas apiladas o en scroll horizontal con cabecera sticky. Prohibido dejar una tabla sin adaptación.
- Contenedor de página: `--layout-container` limitado. Texto corrido: `--layout-prose-max`.
- Reflujo a 320 px sin scroll horizontal.

## Tipografía

- Sans neutra, inyectada con `next/font` en `--font-brand`.
- Jerarquía por peso: 400-500 cuerpo, 500 medio, 600 énfasis. Nunca 900 en v4.
- Tamaños: `--text-sm` para tablas y datos; `--text-base` para cuerpo; `--text-lg` para títulos de sección; `--text-display` es contenido (no gigante).
- `--text-min: 0.75rem` (12 px).
- Números tabulares (`font-variant-numeric: tabular-nums`) en tablas, métricas y dinero. Sin excepciones.
- `--tracking-tight` para cabeceras de tabla.

## Movimiento

- Transiciones rápidas: `--duration-fast` (120 ms) para hover y focus, `--duration-base` (200 ms) para apertura de menús y modales.
- Animar solo `transform` y `opacity`.
- Sin animación coreografiada.
- `prefers-reduced-motion: reduce`: transiciones a `0.01ms`.

## Imágenes

- Sin imágenes grandes. Iconos SVG de `lucide-react`.
- Avatares: ≤ 24-32 px, redondos.
- Sin decoración. Cero héroes.

## Prohibido

- Hex, rgb() o valores arbitrarios en componentes.
- Más de un acento por proyecto.
- Tarjetas infladas donde cabría una fila.
- Píldoras (radios 9999px) fuera de avatares y chips compactos.
- Texto por debajo de 12 px.
- Densidad que sacrifique zona táctil.
- Comunicar estado solo con color.
- Animación decorativa.
- Modales sin cierre.
- Enlaces muertos, botones sin acción, navegación pospuesta.

## Criterios de aceptación del estilo

| ID | Criterio | Verificación |
|---|---|---|
| CA-S1 | Existe `palette.css` con cabecera completa y `check-palette` pasa los 20 pares | Salida del script |
| CA-S2 | Ningún componente contiene hex, rgb() ni valores arbitrarios | Búsqueda: 0 resultados |
| CA-S3 | Ningún texto renderizado por debajo de 12 px | Revisión automatizada |
| CA-S4 | Todo control interactivo tiene zona táctil ≥ 44×44 px en móvil; ≥ 32×32 en escritorio | Prueba e2e/manual |
| CA-S5 | Los efectos usan solo `transform`/`opacity` y se anulan con `prefers-reduced-motion` | Revisión + prueba |
| CA-S6 | Solo hay un `--color-accent` | `check-palette` |
| CA-S7 | Cambiar `palette.css` por cada fixture no requiere editar componentes | Prueba de intercambio |
| CA-S8 | El build emite todas las variables de `tokens.css` | Inspección del CSS |
| CA-S9 | Botones solo-icono con `aria-label`; valoraciones con valor numérico | axe + revisión |
| CA-S10 | Las tablas usan `grid-cols-12` y filas compactas | Revisión visual + código |
| CA-S11 | Los contenedores principales usan `--radius-container`; inputs y controles usan `--radius-control` | Revisión + grep |
| CA-S12 | La jerarquía se comunica por peso y tamaño, no por color | Revisión visual |
| CA-S13 | Los estados llevan icono o texto, nunca solo color | axe + revisión |
| CA-S14 | El sidebar se pliega en drawer en móvil | Prueba manual |
| CA-S15 | En móvil, cada tabla se convierte en filas apiladas o en scroll horizontal con cabecera sticky | Prueba a 320-375-768 px |
| CA-S16 | El logo enlaza a `/`; cero enlaces muertos; cada botón tiene `onClick` o `href` válido | Revisión + axe |
| CA-S17 | El foco es visible en cualquier fila, incluso en tablas densas | Prueba con teclado |
| CA-S18 | Los números en tablas, métricas y dinero usan `tabular-nums` | Revisión visual + grep |

## Decisiones pendientes

1. Fuente base: decisión del proyecto con ADR.
2. Librería de iconos: `lucide-react` (default del OS).
3. Modo oscuro en v4: fuera de alcance de 0.x.
4. Referencias visuales: ninguna. Queda como `borrador-sin-referencias`.
5. Aprobación: con visto bueno y CA-S1 a CA-S18 verificados.
6. Sidebar colapsable (iconos solo) en escritorio: opcional, se decide por proyecto.

## Instrucciones para el agente

1. Antes de escribir UI, confirma `palette.css` válido; si no, aplica `design/palette-rules.md` primero.
2. Usa solo nombres de token.
3. La fila es la unidad. Antes de crear una tarjeta, pregúntate si cabría como fila en `grid-cols-12`.
4. Estados siempre con icono o texto. Nunca solo color.
5. Los controles dentro de filas llevan `aria-label` y zona de impacto correcta.
6. Al cerrar cada tarea de UI, rellena en `sdd/reviews/T-xxx.md` la evidencia de CA-S1 a CA-S18 que apliquen.
7. Una versión aprobada no se edita.

## Cambios

### 0.1.0 — 2026-10-10
- Versión inicial del estilo (borrador sin referencias).
- Derivado de los estándares propios del usuario y de la constitución del OS.
