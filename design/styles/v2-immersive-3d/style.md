---
id: v2-immersive-3d
name: Immersive 3D
version: 0.1.0
status: borrador
surface: marketing
layout: hero-a-pantalla
mode: claro
colors: por-proyecto
references: web de bebida energética (hero) + hero 3D de cripto "Bullo"
---

# v2 — Immersive 3D

## Identidad

Landings con un hero cinematográfico donde el producto o el objeto 3D
protagonista ocupa la pantalla. Superficies claras (blanco o casi),
tarjetas de esquinas generosas, controles en píldora, un único acento
saturado y animación coreografiada con el scroll.

Las dos referencias comparten tres cosas: mucho aire, titular enorme y
muy pesado, y un objeto grande que rompe el contenedor. Difieren en la
paleta: por eso el color es parámetro del proyecto, no del estilo.

## Cuándo usarlo / cuándo no

| Usarlo | No usarlo |
|---|---|
| Landing de producto con hero protagonista | Tiendas y catálogos con muchas pantallas (usar v1) |
| Marca de consumo con identidad fuerte | Sitios editoriales oscuros a sangre (v3) |
| Una sola página, un solo objetivo | Herramientas internas y paneles (v4) |
| Cuando el movimiento y el scroll son parte del mensaje | Cuando el rendimiento en 3G es un requisito duro |

## Principios

1. El hero es la página. Todo lo demás refuerza o cierra.
2. Una sola acción principal visible en todo momento.
3. Movimiento con intención: entrada coreografiada del hero, parallax por capas, transiciones entre secciones.
4. Forma consistente: contenedores `--radius-container`, tarjetas `--radius-card`, controles `--radius-control` (píldora).
5. Texto sobre imagen solo con scrim comprobado (ver `a11y.md`).
6. Sin scroll-jacking. El usuario siempre puede hacer scroll normal.
7. Un solo acento. Prohibido el "azul + rosa" de la referencia B.

## Contrato de tokens

- Estructura (forma, elevación, tipografía, movimiento, parallax, layout) en `tokens.css`.
- Color: 14 tokens con nombre fijo en `palette.css`, según `design/palette-rules.md` (modo claro).
- Los componentes consumen solo nombres de token.

## Patrones de componentes

| Componente | Reglas |
|---|---|
| Nav | Logo a la izquierda; 3-4 enlaces centrados; CTA píldora a la derecha. Fondo transparente sobre el hero; sólido tras hacer scroll. |
| Hero | `--hero-height`, capas en `--parallax-slow/base/fast`. Titular `--text-display` en peso 700-800. Subtítulo `--text-lead` en peso 300-400. CTA píldora. |
| Tarjetas flotantes | Píldora o tarjeta con `--radius-control` / `--radius-card`. Fondo `surface` con `--shadow-float`. Texto sobre fondo sólido, no sobre el degradado. |
| Sello circular | Badge rotado con texto corto. Contraste ≥ 4.5:1. |
| Bloque de iconos 3D | Cada icono ≤ 80 KB. `alt` si son imagen; `aria-hidden` si decorativos. |
| Sección | Ancho completo, contenido centrado a `--layout-container`. Transición de entrada con `--duration-section`, `--ease-out`. |
| Fila de features | Dos o tres columnas. Título en peso alto, descripción `fg-muted`. |
| CTA final | Píldora grande, `accent` / `accent-fg`. Envuelto en `--radius-container`. |
| Footer | Texto `fg-muted` en `--text-min`. Enlaces con contraste AA. |

## Layout

- Hero: `--hero-height` (100dvh), sin contenedor para las capas que rompen márgenes. El texto dentro del hero sí vive en `--layout-container`.
- Secciones: ancho completo con contenido centrado a `--layout-container` y gutter `--layout-gutter`.
- Texto corrido: `--layout-prose-max` (65ch).
- Reflujo a 320 px sin scroll horizontal (WCAG 1.4.10).

## Tipografía

- Sans geométrica, inyectada con `next/font` en `--font-brand`.
- Titular display: peso 700-800. `--text-display` es grande de verdad.
- Subtítulo: peso 300-400, `--text-lead`.
- Mínimo `--text-min` (12 px).

## Movimiento

- Entrada del hero: coreografía hasta `--duration-hero` (1.200-1.600 ms).
- Micro-interacciones: hover, press → `--duration-micro` (200-400 ms).
- Transiciones de sección: `--duration-section` (500-800 ms).
- Parallax: capas con factores `--parallax-slow/base/fast` con Motion `useScroll`/`useTransform`.
- Easing: `--ease-out` para entradas, `--ease-soft` para hover.
- Animar solo `transform` y `opacity`. Nada de `width`, `height`, `top`, `left`, `filter`.
- Sin scroll-jacking. El scroll siempre es nativo.
- `prefers-reduced-motion: reduce`: los tokens se anulan. El hero muestra un fotograma estático.

## Imágenes

- Objeto grande recortado (WebP/AVIF) sobre fondo claro. Reservar dimensiones para no producir CLS.
- Hero: imagen con `priority` alta y `fetchpriority="high"`.
- `srcset` y `sizes` obligatorios.
- Iconos 3D ≤ 80 KB cada uno.
- Presupuesto del hero completo (L1): ≤ 400 KB.
- `alt` obligatorio y descriptivo. Iconos decorativos: `aria-hidden="true"`.

## Prohibido

- Hex, rgb() o valores arbitrarios en componentes.
- Más de un acento por proyecto.
- Texto secundario en gris claro no validado.
- Verde lima sobre blanco como texto.
- Botones con texto blanco sobre acento con contraste < 4.5:1.
- Texto por debajo de 12 px.
- Controles táctiles menores de 44×44 px.
- Scroll-jacking de cualquier tipo.
- Animaciones que duren más de `--duration-hero` en el hero.
- Sombras con color de marca.
- L3 (WebGL en tiempo real) sin ADR.

## Niveles de implementación 3D

- L1 (por defecto): capas de imagen recortadas + Motion. Compatible con Core Web Vitals. Presupuesto del hero ≤ 400 KB.
- L2: vídeo o secuencia prerenderizada controlada por el scroll. ADR obligatorio.
- L3: WebGL en tiempo real. ADR obligatorio.

## Criterios de aceptación del estilo

| ID | Criterio | Verificación |
|---|---|---|
| CA-S1 | Existe `palette.css` con cabecera completa y `check-palette` pasa los 20 pares | Salida del script |
| CA-S2 | Ningún componente contiene hex, rgb() ni valores arbitrarios | Búsqueda en el repo: 0 resultados |
| CA-S3 | Ningún texto renderizado por debajo de 12 px | Revisión automatizada |
| CA-S4 | Todo control interactivo tiene zona táctil ≥ 44×44 px | Prueba e2e/manual |
| CA-S5 | Los efectos usan solo `transform`/`opacity` y se anulan con `prefers-reduced-motion` | Revisión + prueba |
| CA-S6 | Solo hay un `--color-accent` | `check-palette` |
| CA-S7 | Cambiar `palette.css` por cada fixture no requiere editar componentes | Prueba de intercambio |
| CA-S8 | El build emite todas las variables de `tokens.css` | Inspección del CSS generado |
| CA-S9 | Botones solo-icono con `aria-label`; valoración con valor numérico | axe + revisión |
| CA-S10 | El hero completo pesa ≤ 400 KB (L1) | Lighthouse/DevTools |
| CA-S11 | Sin scroll-jacking | Prueba manual + revisión de Motion |
| CA-S12 | Core Web Vitals en móvil: LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms | Lighthouse móvil |
| CA-S13 | Con `prefers-reduced-motion` el hero muestra un fotograma estático | Prueba con la preferencia activada |

## Decisiones pendientes

1. Fuente base: decisión del proyecto con ADR. El OS sugiere Geist.
2. Modo oscuro: fuera de alcance de 0.x.
3. Librería de iconos: `lucide-react` (default del OS).
4. Aprobación: con visto bueno y CA-S1 a CA-S13 verificados.
5. Presupuestos de peso (hero 400 KB, icono 80 KB): propuestos.

## Instrucciones para el agente

1. Antes de escribir UI, confirma `palette.css` válido; si no, aplica `design/palette-rules.md` primero.
2. Usa solo nombres de token.
3. Antes de animar algo, comprueba que existe un token de duración adecuado.
4. Al cerrar cada tarea de UI, rellena en `sdd/reviews/T-xxx.md` la evidencia de CA-S1 a CA-S13 que apliquen.
5. Una versión aprobada no se edita.

## Cambios

### 0.1.0 — 2026-10-10
- Versión inicial del estilo (borrador).
