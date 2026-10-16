---
style: v3-editorial-dark
version: 0.1.0
status: borrador
mode: oscuro
points_to: design/palette-rules.md
---

# palette-rules.md — v3 Editorial Dark

La regla general está en `design/palette-rules.md`. Este archivo recoge
solo las particularidades de v3.

## Modo

`oscuro`. Es el primer estilo del OS que ejercita la derivación oscura
del documento general. Los 14 tokens se mantienen con los mismos
nombres, pero los valores vienen de la sección "Derivación en modo
oscuro".

Recordatorio de la dirección:
- `bg` L ≈ 0.14 (carbón casi negro).
- `accent` sube de L (0.65-0.72): los acentos oscuros desaparecen sobre
  fondo oscuro.
- `accent-fg` suele ser oscuro (L ≈ 0.15), no blanco.
- `fg` L ≈ 0.95; `fg-muted` L ≈ 0.72.
- `danger` y `success` son claros (L ≈ 0.70).

## Endurecimientos propios de v3

1. Contraste reforzado sobre foto a sangre. Cualquier texto sobre
   fotografía (titular, etiquetas, contador) exige scrim medido en el
   peor punto.

2. Mayúsculas con tracking solo en titulares y etiquetas cortas. En
   párrafos están prohibidas.

3. Mínimo tipográfico 14 px, no 12. Los textos diminutos de la
   referencia (contador, etiquetas verticales, resumen) suben.

4. Flechas del slider: contraste ≥ 4.5:1 y zona táctil ≥ 44×44 px.

5. Nada de acento oscuro. Si la semilla es oscura (azul marino, vino,
   verde botella), hay que subir L hasta 0.65-0.72 para que se vea sobre
   fondo oscuro. Si no converge, pedir otra semilla.

6. Sombra no es color. La elevación en modo oscuro es muy sutil, pero no
   lleva tinte de marca.

## Notas específicas de v3

- Un solo acento. En la referencia es rojo. En un proyecto puede ser
  otro color, pero uno solo.

- Rojo como semilla: colisiona con `danger`. Avisar en la cabecera del
  `palette.css`. Los errores siempre con icono o texto, además de color.

- Verde como semilla: colisiona con `success`. Mismo aviso.

- Fondos con matiz: el `bg` en v3 puede tener un matiz sutil del acento
  (croma bajo). Nunca negro puro si el acento es de un tono saturado.

## Ver también

- `design/palette-rules.md` — derivación general (claro/oscuro), casos
  límite, contrato de salida, validación.
- `design/styles/v3-editorial-dark/a11y.md` — los 20 pares y reglas
  derivadas específicas de v3 (texto sobre foto, contraste variable).
- `design/styles/v3-editorial-dark/palette.template.css`.
