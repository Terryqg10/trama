# rules/styles.md

## Regla de oro (cuándo preguntar el estilo)

Antes de crear o modificar UI:

1. Lee el estilo actual en `sdd/plans/PLAN-XXX.md`.
2. PREGUNTA solo si:
   - El proyecto no tiene estilo definido aún.
   - La tarea es un panel de administración o herramienta interna
     (sugiere v4-dense-workspace).
   - La tarea es explícitamente de exploración o rediseño.
3. NO PREGUNTES si la tarea es una continuación lógica del estilo
   actual (ej. un componente de tienda en un proyecto v1). En ese caso,
   asume el estilo actual y procede.
4. Al preguntar, lee `design/styles/index.md` y ofrece las opciones:
   v1-soft-commerce, v2-immersive-3d, v3-editorial-dark,
   v4-dense-workspace o nueva exploración.
5. Confirma que existe palette.css válido. Si no, aplica
   design/styles/vX-…/palette-rules.md primero.
6. Pasa check-palette antes de escribir UI.

## Contrato de tokens

- Estructura: design/styles/vX-…/tokens.css.
- Color: palette.css del proyecto. 14 tokens con nombre fijo.
- Los componentes consumen solo nombres de token.

Prohibido en componentes:
- Hex, rgb(), hsl().
- Valores arbitrarios (w-[347px]).
- Un segundo --color-accent.
- Cambiar tokens.css o palette.css desde dentro de un componente.

## Cambio de estilo o de paleta

- Cambiar de estilo: /style → /decide → sustituir tokens.css y ajustar
  palette.css. Los componentes no se tocan.
- Cambiar de semilla: reescribir palette.css, pasar check-palette.
- Cambio de identidad completo: ADR + revisar la spec de marca.

## Estilos aprobados son inmutables

Un estilo aprobado no se edita. Un cambio crea versión nueva con ADR.

## Responsive (móvil primero)

El CSS base es para móvil. Los breakpoints se aplican con `min-width`
para ampliar, nunca al revés.

Breakpoints (contrato del OS, definidos en cada tokens.css):
- `--bp-sm: 640px`
- `--bp-md: 768px`
- `--bp-lg: 1024px`
- `--bp-xl: 1280px`

Reglas:
- Escribir primero el layout móvil. Añadir el desktop después.
- La navegación tiene comportamiento móvil declarado antes de cerrar la
  tarea: menú plegable, drawer, tab bar inferior, o equivalente.
- Las áreas táctiles cumplen 44×44 px en móvil.
- Ningún texto baja de `--text-min`.
- Los titulares display escalan: los tokens usan `clamp()`.
- Se prueban 320, 375, 768 y 1280 px antes de cerrar cualquier tarea
  de UI, y se revisan los anchos intermedios (p. ej. 480-700 px, donde
  un nav de escritorio se rompe antes de llegar al breakpoint).
- El test `pnpm test:e2e` incluye `tests/responsive.spec.ts`: barrido
  de 18 anchos entre 320 y 1280 px (a ambos lados de cada `--bp-*`) que
  falla si algún elemento de header, nav, main o footer se sale del
  viewport o queda recortado. Excepciones explícitas: `overflow-x:
  auto|scroll` deliberado o `data-allow-overflow` en el contenedor.
- Prohibido esconder un desbordamiento con `overflow-x: hidden` en
  html/body: arregla la causa (el nav debe plegarse antes de que sus
  enlaces dejen de caber).

## Imágenes Responsive y Rendimiento (CLS)

- Todas las imágenes deben tener un atributo `sizes` adecuado (ej.
  `(min-width: 1024px) 33vw, 100vw`).
- Siempre se debe reservar el espacio de la imagen (relación de aspecto)
  para evitar el Cumulative Layout Shift (CLS). Usa `aspect-ratio` o
  width/height declarados.
- En Next.js, usa el componente `<Image>` con las props `width` y
  `height` (o `fill` con un contenedor con aspect-ratio).
- Si la imagen tiene un recorte distinto en móvil vs escritorio, usa
  `<picture>` o el arte de dirección de `next/image`.
