---
style: v2-immersive-3d
version: 0.1.0
status: borrador
mode: claro
points_to: design/palette-rules.md
---

# palette-rules.md — v2 Immersive 3D

La regla general está en `design/palette-rules.md`. Este archivo recoge
solo las particularidades de v2.

## Modo

`claro`. v2 asume fondo claro (bg L ≈ 0.97, surface blanco). No hay modo
oscuro en 0.x.

## Endurecimientos propios de v2

Estas reglas endurecen el documento general (nunca lo relajan):

1. Texto sobre imagen o degradado exige scrim comprobado. No basta con
   que el par `fg`/`bg` cumpla: hay que medir el peor punto del texto
   sobre la imagen real. Documentarlo en `sdd/reviews/T-xxx.md`.

2. Tarjetas flotantes sobre el hero con degradado: el texto dentro de la
   tarjeta vive sobre `surface` sólido, nunca sobre el degradado. La
   tarjeta puede tener transparencia parcial, pero el área de texto tiene
   fondo sólido.

3. Prohibido `accent` como texto sobre fondos claros directamente. Usa
   `accent-text` (que puede coincidir con `accent` si cumple). Esto evita
   repetir el fallo del "verde lima sobre blanco" de la referencia A.

4. Botones con texto blanco sobre `accent`: verificar 4.5:1. La
   referencia B tenía un botón azul con ~3,7:1. `check-palette` bloquea
   esto.

## Notas específicas de v2

- Un solo acento por proyecto. La referencia B tenía dos (azul + rosa):
  prohibido. Los colores secundarios solo aparecen en imágenes.

- El acento puede ser más saturado que en v1, pero con L ajustada para
  que `accent-fg` cumpla 4.5:1. Acentos "neón" (lima brillante, cian
  brillante) sobre blanco casi nunca llegan: si la semilla es así, cambia
  de semilla.

- El titular sobre el hero (que puede ir sobre `bg` claro o sobre imagen)
  tiene reglas distintas según el caso:
  - Sobre `bg`/`surface`: par normal `fg`/`bg` (4.5:1).
  - Sobre imagen/degradado: scrim medido en el peor punto.

## Ver también

- `design/palette-rules.md` — derivación completa (claro/oscuro), casos
  límite, contrato de salida, validación.
- `design/styles/v2-immersive-3d/a11y.md` — los 20 pares y reglas
  derivadas específicas de v2 (texto sobre imagen, contraste variable).
- `design/styles/v2-immersive-3d/palette.template.css`.
