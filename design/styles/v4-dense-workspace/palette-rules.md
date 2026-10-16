---
style: v4-dense-workspace
version: 0.1.0
status: borrador-sin-referencias
mode: claro
points_to: design/palette-rules.md
---

# palette-rules.md — v4 Dense Workspace

La regla general está en `design/palette-rules.md`. Este archivo recoge
solo las particularidades de v4.

## Modo

`claro`. v4 asume fondo claro. No hay modo oscuro en 0.x.

## Endurecimientos propios de v4

1. El acento solo en la acción principal. En v4 no hay acentos
   decorativos, ni encabezados de acento, ni iconos de acento. El acento
   aparece en el CTA principal y en el estado activo de la navegación.

2. Estados siempre con icono o texto. Los pares P19 y P20 (badges) y
   P17/P18 (texto de error/éxito) son el suelo. En v4, además, cada
   estado lleva un icono o una etiqueta textual. El color nunca va solo.

3. Contraste reforzado en cabeceras de tabla. El texto fg-muted de las
   cabeceras va sobre surface-muted: par P06. Si el proyecto tiene
   muchas tablas, se recomienda subir a 7:1 (AAA) para ese par.

4. Nada de acento sobre surface-muted. El acento solo sobre bg o surface.

5. Números tabulares. No es un criterio de contraste, pero es una regla
   de legibilidad: tabular-nums en todo dato numérico de tabla.

## Notas específicas de v4

- Un solo acento por proyecto. En herramientas, el acento suele ser azul
  o índigo, pero la regla es la misma que en cualquier estilo.

- Semillas muy saturadas (turquesa brillante, verde neón) pueden
  funcionar, pero conviene comprobar P16 (accent / bg ≥ 3:1) con cuidado.

- La densidad no justifica saltarse la matriz. Cabeceras, badges y
  controles de fila cumplen igual.

## Ver también

- `design/palette-rules.md` — derivación general, casos límite, contrato
  de salida, validación.
- `design/styles/v4-dense-workspace/a11y.md` — los 20 pares y reglas
  derivadas específicas de v4.
- `design/styles/v4-dense-workspace/palette.template.css`.
