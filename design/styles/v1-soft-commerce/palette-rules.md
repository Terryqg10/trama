---
style: v1-soft-commerce
version: 0.3.0
status: borrador
mode: claro
points_to: design/palette-rules.md
---

# palette-rules.md — v1 Soft Commerce

La regla general está en `design/palette-rules.md`. Este archivo solo
recoge las particularidades de v1.

## Modo

`claro`. v1 asume fondo claro (bg L ≈ 0.97, surface blanco). No hay modo
oscuro en 0.x.

## Endurecimientos propios de v1

Ninguno. v1 usa los umbrales del documento general (4.5:1 texto, 3:1 UI)
tal cual.

## Notas específicas de v1

- El texto secundario (marca, volumen, "View all", placeholders) usa
  siempre `fg-muted`, nunca un gris más claro. Esto corrige el fallo de
  contraste de las referencias (ver `a11y.md`).
- `accent-fg` por defecto es blanco; con semillas claras (amarillo, lima,
  pastel) cambia a oscuro y se documenta en la cabecera de `palette.css`.
- Un solo `--color-accent` por proyecto. Los demás colores de marca solo
  aparecen en imágenes, no en texto de interfaz.

## Ver también

- `design/palette-rules.md` — derivación completa, casos límite,
  contrato de salida, validación, comportamiento del agente.
- `design/styles/v1-soft-commerce/a11y.md` — los 20 pares y reglas
  derivadas.
- `design/styles/v1-soft-commerce/palette.template.css` — plantilla de
  `palette.css` del proyecto.