---
id: v1-soft-commerce
name: Soft Commerce
version: 0.5.0
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

## Filtros y búsqueda

Convención del sector para tiendas de consumo. No se inventa: se sigue
salvo justificación explícita en `sdd/plans/` bajo `## Decisiones de UI`.

### Escritorio (≥ --bp-lg)

- **Columna lateral izquierda** con los filtros, ancho fijo
  (`--filter-sidebar-width`, nuevo token en tokens.css si no existe;
  por defecto 16rem / 256px). El catálogo ocupa el resto del ancho a la
  derecha.
- **La columna es sticky** al hacer scroll. Solo se mueven los
  resultados, no los filtros.
- Orden de los filtros: categoría → filtros específicos del producto
  (talla, color, material) → rango de precio → disponibilidad →
  etiquetas. El usuario ve primero lo que más usa.
- Botones "Aplicar filtros" y "Limpiar" al final del panel.
- Contador de filtros activos en la cabecera del panel ("3 activos").
- La búsqueda vive en la **cabecera** de la página, no dentro del
  panel de filtros.

### Móvil (< --bp-md)

- **Botón "Filtros"** flotante o en la cabecera de la página, junto al
  contador de resultados.
- Al pulsarlo, se abre un **drawer o bottom-sheet a pantalla completa**.
- Cabecera del drawer: título "Filtros", botón de cerrar, contador de
  activos.
- Pie del drawer: "Limpiar" (izquierda) y "Aplicar filtros" (derecha,
  en `accent`). Ancho completo.
- El drawer no empuja los productos: se superpone.

### Prohibido

- Poner los filtros como panel desplegable **encima del catálogo** en
  escritorio. Es lo que hace un formulario, no una tienda. Empuja los
  productos hacia abajo y rompe la convención.
- Filtrar sin contador de activos. El usuario tiene que saber cuántos
  filtros ha aplicado.
- Botones "Aplicar" fuera del área de filtros.

## Navegación y Header

El header debe tener `sticky top-0 z-50` en todos los proyectos. Siempre
debe ser visible al hacer scroll (tanto en escritorio como en móvil). Si
el diseño es transparente sobre el hero, debe volverse opaco al hacer
scroll (usando un evento de scroll o Intersection Observer). El menú
móvil debe ser un overlay a pantalla completa (nunca un desplegable) y
debe incluir siempre el botón de 'Reservar' o 'Contactar'.

## Menú móvil

Convención del sector para tiendas de consumo: menú a pantalla
completa, no dropdown.

### Comportamiento

- **Escritorio (≥ --bp-md):** menú horizontal en la cabecera. Sin
  overlay.
- **Móvil (< --bp-md):** icono de menú a la derecha de la cabecera.
  Al pulsarlo, se abre un **overlay a pantalla completa** que ocupa
  `100dvh`.
- El overlay ocupa todo el viewport. Fondo `--color-bg` o `--color-surface` opaco.
  No se ve el catálogo detrás.
- **Cabecera del overlay:** logo + icono X para cerrar.
- **Cuerpo del overlay:** items del menú en vertical, alineados a la
  izquierda. Tipografía en `--text-lg` (18 px) o superior, con
  espaciado generoso entre items (mínimo 16 px vertical).
- **Item activo:** en `--color-accent-text`, con peso 600.
- **Pie del overlay:** accesos a cuenta, carrito, y buscador si
  existe. Alineados a la izquierda, tamaño reducido.
- **Scroll lock:** mientras está abierto, el fondo no scrollea.
- **Focus trap:** el foco entra en el overlay al abrir y no sale hasta
  cerrarlo.
- **Cierres:** X, Esc, elegir un enlace. Con JS. Sin JS, el mismo
  patrón que el drawer de filtros (hash + `:target`).

### Prohibido

- Desplegar el menú como dropdown bajo la cabecera. Rompe la
  convención, desperdicia el alto del viewport, y deja ver el
  contenido detrás.
- Menú horizontal en móvil (los items no caben).
- Cerrar el menú con click fuera. En overlay a pantalla completa no
  aplica: no hay "fuera".

### Icono del menú

Es un `<a href="#menu-movil">`, no un `<button>`. Funciona sin JS por
CSS `:target`. Con JS, un hook cliente (`useHashOverlay`) sincroniza
el estado.

Icono: `Menu` de lucide. Si el estado es abierto, se sustituye por `X`
(o el overlay tiene su propia X en la cabecera).

## Controles de formulario

### `<select>`

Siempre con chevron custom. El nativo del navegador no se usa: tiene
posición distinta entre Chrome, Safari y Firefox, no respeta el
padding, y no usa los tokens del estilo.

Implementación:

    <div class="relative inline-block">
      <select class="appearance-none pr-10 ...">...</select>
      <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>

- `appearance: none` en el select.
- Padding derecho suficiente para que el texto no choque con el icono.
- Icono `ChevronDown` de lucide, `pointer-events: none` para no
  bloquear clics.
- Alineación vertical centrada.

### `<input>`

- `--radius-control` (píldora) para campos de texto y números.
- Altura consistente con `--control-height`.
- Foco visible (outline del estilo).
- Ningún input nativo sin estilizar.

### `<checkbox>` y `<radio>`

- Personalizados con el color `--color-accent` cuando están marcados.
- Nunca el nativo del navegador.
- Los `radio` con apariencia de chip (píldora) cuando representan
  filtros de talla, color, categoría.

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

## Responsive

Mobile-first. El layout base es de una columna; el escritorio amplía.

- **Rejilla de productos:** 2 columnas hasta `--bp-md`; 3 a partir de
  `--bp-md`; 4 a partir de `--bp-lg`.
- **Cabecera:** en móvil se reduce a logo + dos iconos (búsqueda y
  carrito). Los enlaces de navegación se pliegan en un menú lateral o en
  un drawer. En escritorio se muestran todos los enlaces en horizontal.
- **Barra de pestañas inferior:** solo en móvil (`< --bp-md`). En
  escritorio se oculta; la navegación pasa a la cabecera.
- **Banner hero:** en móvil la imagen va arriba y el texto abajo, en
  columna. En escritorio, el texto a la izquierda y el producto a la
  derecha. El CTA siempre visible sin hacer scroll.
- **Ficha de producto:** en móvil, imagen arriba y barra inferior fija
  con el CTA. En escritorio, dos columnas: imagen a la izquierda,
  información a la derecha.
- **Fila de carrito:** en móvil, cada artículo ocupa el ancho completo
  en dos líneas (miniatura + datos arriba, precio + stepper abajo). En
  escritorio, una sola fila.
- **Controles táctiles:** en móvil, ≥ 44×44 px. En escritorio pueden
  reducirse a 36×36 px, pero nunca por debajo de 32×32.
- **Tipografía display:** los tokens usan `clamp()`. El titular del
  banner no baja de `--text-display` mínimo.

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

### 0.5.0 — 2026-10-16
- Nueva sección "Menú móvil": overlay a pantalla completa en móvil,
  no dropdown. Icono como `<a href="#menu-movil">` con fallback sin JS.
- Nueva sección "Controles de formulario": chevron custom en
  `<select>`, inputs y checkbox/radio estilizados.
- Motivación: Trama construyó un menú dropdown que rompía la
  convención, y un `<select>` con chevron nativo desalineado. A partir
  de ahora está documentado.

### 0.4.0 — 2026-10-16
- Añadida sección "Filtros y búsqueda" con la convención del sector
  (columna lateral en escritorio, drawer en móvil).
- Motivación: el proyecto Trama colocó los filtros encima del catálogo,
  rompiendo la convención. A partir de ahora está documentado.

### 0.3.0 — 2026-10-10
- Administrativo. La regla de paleta se generaliza a `design/palette-rules.md`. Este estilo pasa a ser un stub que apunta al general.
- No cambia ningún valor visual.