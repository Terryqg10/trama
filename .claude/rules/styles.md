# rules/styles.md

## Regla de oro

Antes de crear o modificar UI:

1. Lee `design/styles/index.md`.
2. Pregunta al usuario con qué estilo empezar. Formato:
   ¿Con qué estilo empezamos?
   - v1-soft-commerce (actual)
   - v2-immersive-3d
   - v3-editorial-dark
   - v4-dense-workspace
   - Nueva exploración
3. Confirma que existe palette.css válido. Si no, aplica
   design/styles/vX-…/palette-rules.md primero.
4. Pasa check-palette antes de escribir UI.

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
  de UI.
- El test `pnpm test:e2e` incluye `tests/responsive.spec.ts`, que
  comprueba desbordamientos estructurales.
