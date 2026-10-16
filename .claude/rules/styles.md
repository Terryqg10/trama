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
