---
id: v1-soft-commerce
name: Soft Commerce
version: 0.3.0
status: borrador
surface: consumo
layout: contenido-centrado
mode: claro
colors: por-proyecto
references: 3 apps móviles de e-commerce (cuidado de la piel, moda, supermercado)
---

# v1 — Soft Commerce

## Identidad

Minimalismo cálido donde el producto es el protagonista. Superficies
claras tintadas con el color de marca, tarjetas de esquinas muy
redondeadas, controles en forma de píldora y un único acento oscuro y
saturado para las acciones.

## Cuándo usarlo / cuándo no

| Usarlo | No usarlo |
|---|---|
| Tienda online, catálogo, ficha de producto, carrito | Paneles internos y herramientas de datos (usar v4) |
| App móvil de consumo con búsqueda y filtros | Heroes cinematográficos con 3D y scroll (v2) |
| Landing de producto sencilla | Sitios editoriales oscuros a pantalla completa (v3) |

## Principios

1. El producto manda: imagen grande sobre tesela neutra, el texto nunca compite con ella.
2. Una sola acción principal por pantalla, siempre en el color de acento.
3. Jerarquía por peso tipográfico y espacio, no por colores extra.
4. Forma consistente: tarjetas `--radius-card`, contenedores `--radius-container`, controles `--radius-control` (píldora).
5. Sombras suaves y neutras; nunca sombras duras ni tintadas.

## Contrato de tokens

- Estructura: `tokens.css` (forma, elevación, tipografía, movimiento, layout).
- Color: 14 tokens fijos, valores por proyecto en `palette.css`.
- Los componentes consumen solo nombres de token.

## Patrones de componentes

| Componente | Reglas |
|---|---|
| Cabecera | Logo a la izquierda (enlaza a `/`), acciones con icono a la derecha. Iconos solo-icono con `aria-label`. |
| Búsqueda | Campo píldora con icono y botón de filtros al lado. |
| Banner hero | `--radius-container`, fondo `accent-soft`, titular en peso alto, subtítulo `fg-muted`, CTA píldora. Texto sobre imagen solo con scrim comprobado. |
| Atajos de categoría | Teselas redondas con icono y etiqueta (4 por fila). |
| Chips de filtro | Píldora. Activo: `accent` + `accent-fg`. Inactivo: `surface` con `border-strong`. |
| Tarjeta de producto | Imagen sobre `surface-muted`, nombre semibold, marca y volumen en `fg-muted`, precio en negrita, valoración, corazón de favoritos, insignia de descuento. Botón circular de añadir en `accent`. |
| Ficha de producto | Imagen grande, miniaturas, título, valoración, precio, chips de talla, barra inferior con CTA. |
| Fila de carrito | Casilla, miniatura, nombre, precio, stepper, papelera. Cupón, totales, CTA. |
| Barra de pestañas inferior | Contenedor flotante redondeado, 4-5 destinos. Icono Y etiqueta. Activo en `accent-text`. |
| Insignias | Píldora, texto ≥ 12 px. |
| Botón primario | Píldora, `accent` / `accent-fg`, hover `accent-hover`. |

## Layout

- Mobile-first. Contenedor `--layout-container`, margen `--layout-gutter`.
- Rejilla de productos: 2 columnas en móvil, 3-4 en escritorio.
- Texto corrido con `--layout-prose-max`.

## Tipografía

- Sans humanista o geométrica, inyectada con `next/font` en `--font-brand`.
- Contraste de peso: títulos y precios en 600-700, texto en 400-500.
- Mínimo `--text-min` (12 px).

## Movimiento

- Hover de tarjeta: `translateY` + `scale`, `--duration-base`, `--ease-soft`.
- Pulsación: `--press-scale`, `--duration-fast`.
- Solo `transform` y `opacity`.
- `prefers-reduced-motion`: los tokens se anulan solos.

## Imágenes

- Producto recortado (WebP/AVIF) sobre `surface-muted`, proporción 1:1 o 4:5.
- `alt` obligatorio. `srcset` y tamaños responsive.

## Prohibido

- Hex, rgb() o valores arbitrarios en componentes.
- Más de un acento por proyecto.
- Texto secundario con tonos claros no validados.
- Texto por debajo de 12 px.
- Controles táctiles menores de 44×44 px.
- Sombras con color de marca.
- Paleta copiada de `examples/` sin pasar por el proceso de deducción.

## Criterios de aceptación del estilo

| ID | Criterio | Verificación |
|---|---|---|
| CA-S1 | Existe `palette.css` con cabecera completa y `check-palette` pasa los 20 pares | Salida del script |
| CA-S2 | Ningún componente contiene hex, rgb() ni valores arbitrarios | Búsqueda en el repo: 0 resultados |
| CA-S3 | Ningún texto renderizado por debajo de 12 px | Revisión automatizada |
| CA-S4 | Todo control interactivo tiene zona táctil ≥ 44×44 px | Prueba e2e/manual |
| CA-S5 | Los efectos usan solo `transform`/`opacity` y se anulan con `prefers-reduced-motion` | Revisión + prueba |
| CA-S6 | Solo hay un `--color-accent` | `check-palette` |
| CA-S7 | Cambiar `palette.css` por cada fixture de `examples/` no requiere editar componentes | Prueba de intercambio |
| CA-S8 | El build emite todas las variables de `tokens.css` | Inspección del CSS generado |
| CA-S9 | Botones solo-icono con `aria-label`, valoración con valor numérico | axe + revisión |

## Decisiones pendientes

1. Fuente base (se inyecta en `--font-brand`): decisión del proyecto con ADR.
2. Modo oscuro: fuera de alcance de 0.x.
3. Librería de iconos: no fijada.
4. Aprobación del estilo: pasa a `aprobado` con visto bueno y CA-S1 a CA-S9 verificados.

## Instrucciones para el agente

1. Antes de escribir UI, confirma que el proyecto tiene `palette.css` válido; si no, aplica `palette-rules.md` primero.
2. Usa solo nombres de token. Si necesitas un valor que no existe, propón un token nuevo.
3. Al cerrar cada tarea de UI, rellena en `review.md` la evidencia de CA-S1 a CA-S9 que apliquen.
4. Una versión `aprobada` no se edita: un cambio crea 0.x nueva con ADR.

## Cambios

### 0.3.0 — 2026-10-10
- Administrativo. La regla de paleta se generaliza a `design/palette-rules.md`. Este estilo pasa a ser un stub que apunta al general.
- No cambia ningún valor visual.