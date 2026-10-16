---
id: v3-editorial-dark
name: Editorial Dark
version: 0.1.0
status: borrador
surface: marca
layout: a-sangre
mode: oscuro
colors: por-proyecto
references: hero split oscuro con titular gigante y slider con contador
---

# v3 — Editorial Dark

## Identidad

Sitios oscuros de carácter editorial: fondo carbón casi negro, fotografía
a sangre, titular gigante en tres niveles tipográficos, un único acento
(rojo en la referencia) usado con tacañería, y esquinas rectas en todo.
Movimiento contenido: transiciones de slider, entradas de texto breves.
Sin parallax pesado (eso es v2).

La página se lee como una revista: titular grande, línea pequeña, foto
grande, cifras y contadores. Nada compite con el titular.

## Cuándo usarlo / cuándo no

| Usarlo | No usarlo |
|---|---|
| Marca con carácter (moda, editorial, música, cultura) | Tiendas y catálogos con muchas pantallas (v1) |
| Web de una sola historia o de un producto único | Landings con hero 3D y animación coreografiada (v2) |
| Cuando el titular y la foto son el mensaje | Herramientas internas y paneles (v4) |
| Portafolios, revistas digitales | Cuando el cliente pide "alegre y luminoso" |

## Principios

1. El titular manda. Todo lo demás lo sirve.
2. Un solo acento. Se usa con tacañería.
3. Esquinas rectas: `--radius-*: 0`. Sin excepciones.
4. A sangre: nav y hero ocupan el ancho y el alto completos.
5. Texto corrido limitado a `--layout-prose-max` (60-75 caracteres). Contenedor ancho no significa líneas largas.
6. Movimiento contenido. Sin parallax, sin scroll-jacking.
7. Mayúsculas con tracking solo en titulares y etiquetas cortas.
8. Nada de texto por debajo de `--text-min` (14 px en v3).

## Contrato de tokens

- Estructura (forma, elevación, tipografía, movimiento, layout) en `tokens.css`.
- Color: 14 tokens con nombre fijo en `palette.css`, según `design/palette-rules.md` (modo oscuro).
- Los componentes consumen solo nombres de token.

## Patrones de componentes

| Componente | Reglas |
|---|---|
| Nav | A todo el ancho, mayúsculas con tracking (`--tracking-caps`), sin contenedor interno. Logo a la izquierda, 4-5 enlaces centrados o a la derecha, CTA discreto. |
| Hero split | `--hero-height: 100dvh`. Columna izquierda: fotografía a sangre, sin márgenes. Columna derecha: tres niveles de titular. |
| Titular en tres niveles | Nivel 1: mayúsculas pequeñas con `--tracking-caps`. Nivel 2: `--text-display` en peso 700-800. Nivel 3: mayúsculas pequeñas. |
| Slider | Contador `01 — 03` con barra de progreso. Cuadrado con flechas prev/next. Zona táctil ≥ 44×44 px; contraste de la flecha ≥ 4.5:1. |
| Etiquetas giradas | Mayúsculas pequeñas, giradas 90°, en el margen derecho. `--text-label` (14 px). Contraste ≥ 4.5:1 sobre `bg`. |
| Franja inferior | Tarjeta con miniatura + título + texto corto. Texto ≥ `--text-label`. |
| Tarjeta de contenido | Esquinas rectas, fondo `surface` o `surface-muted`, borde `border`. Sin sombra o sombra muy sutil. |
| Bloque de cifras | Números grandes (peso alto), etiqueta pequeña en mayúsculas con tracking. |
| CTA | Rectangular, `accent` / `accent-fg`, hover `accent-hover`. Sin forma de píldora. |
| Footer | Fondo `bg`, texto `fg-muted`, tamaño mínimo `--text-min`. |

## Layout

- `--layout-container: 100%` — el contenedor general no tiene márgenes.
- `--layout-gutter` se aplica como padding lateral a secciones con contenido, no al hero ni a la foto a sangre.
- `--layout-prose-max: 68ch` para texto corrido.
- `--hero-height: 100dvh`. Nunca `100vw` (incluye la barra de scroll).
- Rejilla editorial: 12 columnas cuando haga falta; el hero usa split 50/50 o 60/40.
- Documentación: tres columnas con `--layout-prose-max` en la del medio.

## Tipografía

- Sans ancha, inyectada con `next/font` en `--font-brand`.
- Tres niveles en el hero.
- `--tracking-caps` para todas las mayúsculas con tracking.
- Pesos: 400-500 cuerpo, 700-800 titulares.
- Mínimo `--text-min` (14 px en v3).
- Mayúsculas con tracking solo en titulares y etiquetas cortas.

## Movimiento

- Transiciones de slider: `--duration-slide` (600 ms) con `--ease-out`.
- Entradas de texto: `--duration-enter` (400 ms), desplazamiento pequeño.
- Hover: `--duration-micro` (200 ms). Solo `transform` y `opacity`.
- Sin parallax.
- `prefers-reduced-motion: reduce`: los tokens se anulan. Slider cambia con crossfade instantáneo.

## Imágenes

- Fotografía a sangre (AVIF/WebP). Recortes distintos para móvil y escritorio.
- Reserva de dimensiones para evitar CLS.
- `alt` obligatorio y descriptivo.
- La foto del hero con `priority` alta.
- Servir con `srcset` y `sizes`. En móvil, la foto va arriba; en escritorio, izquierda.

## Prohibido

- Hex, rgb() o valores arbitrarios en componentes.
- Más de un acento por proyecto.
- Esquinas redondeadas en cualquier elemento.
- Texto por debajo de 14 px en v3.
- Mayúsculas con tracking en párrafos.
- Texto sobre foto sin scrim medido en el peor punto.
- Flechas finas sobre fondo de acento sin verificar contraste.
- Controles táctiles menores de 44×44 px.
- Parallax pesado (eso es v2).
- Scroll-jacking.
- `100vw` como ancho de contenedor.
- Modo claro (sería v3-claro, versión nueva, con ADR).

## Criterios de aceptación del estilo

| ID | Criterio | Verificación |
|---|---|---|
| CA-S1 | Existe `palette.css` con cabecera completa y `check-palette` pasa los 20 pares | Salida del script |
| CA-S2 | Ningún componente contiene hex, rgb() ni valores arbitrarios | Búsqueda: 0 resultados |
| CA-S3 | Ningún texto renderizado por debajo de 14 px (v3 endurece el general) | Revisión automatizada |
| CA-S4 | Todo control interactivo tiene zona táctil ≥ 44×44 px | Prueba e2e/manual |
| CA-S5 | Los efectos usan solo `transform`/`opacity` y se anulan con `prefers-reduced-motion` | Revisión + prueba |
| CA-S6 | Solo hay un `--color-accent` | `check-palette` |
| CA-S7 | Cambiar `palette.css` por cada fixture no requiere editar componentes | Prueba de intercambio |
| CA-S8 | El build emite todas las variables de `tokens.css` | Inspección del CSS |
| CA-S9 | Botones solo-icono con `aria-label` | axe + revisión |
| CA-S10 | Todas las esquinas son rectas (`--radius-*: 0`) | Revisión visual + grep |
| CA-S11 | Texto sobre foto tiene scrim medido en el peor punto y cumple 4.5:1 | Medición documentada en `sdd/reviews/T-xxx.md` |
| CA-S12 | Mayúsculas con tracking solo en titulares y etiquetas cortas | Revisión + grep |
| CA-S13 | Reflujo a 320 px sin scroll horizontal, pese a `--layout-container: 100%` | Prueba manual |
| CA-S14 | El slider con contador y barra de progreso funciona con teclado y anuncia su estado a lectores de pantalla | Prueba con teclado + revisión ARIA |
| CA-S15 | Las etiquetas giradas del margen son legibles con zoom al 200 % y cumplen contraste ≥ 4.5:1 | Prueba con zoom + medición |
| CA-S16 | No se usa `100vw` en ningún sitio | grep en el repo: 0 resultados |

## Decisiones pendientes

1. Fuente base: decisión del proyecto con ADR.
2. Librería de iconos: `lucide-react` (default del OS).
3. Modo claro: fuera de alcance. Sería `v3-editorial-light` (con ADR).
4. Aprobación: con visto bueno y CA-S1 a CA-S16 verificados.
5. Contenido de las etiquetas giradas: se decide por proyecto.

## Instrucciones para el agente

1. Antes de escribir UI, confirma `palette.css` válido; si no, aplica `design/palette-rules.md` (modo oscuro) primero.
2. Usa solo nombres de token.
3. `--layout-container: 100%` es del contenedor general. El hero y la foto a sangre no llevan padding lateral. El contenido de secciones sí.
4. Cualquier texto sobre foto: mide scrim en el peor punto y documenta en `review.md`.
5. Al cerrar cada tarea de UI, rellena en `sdd/reviews/T-xxx.md` la evidencia de CA-S1 a CA-S16 que apliquen.
6. Una versión aprobada no se edita.

## Cambios

### 0.1.0 — 2026-10-10
- Versión inicial del estilo (borrador).
