---
id: ADR-007
title: Colores de las muestras de color de la ficha como tokens CSS del proyecto
status: aceptada
date: 2026-10-16
os_version: 0.3.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda]
---

# ADR-007 — Muestras de color como tokens CSS del proyecto

## Contexto

El selector de color de la ficha pasa de chips de texto a círculos con el color real de cada
variante (Enmienda 12 de SPEC-001, T-030). Cada nombre de color del catálogo (azul, beige, blanco,
burdeos, gris, negro, verde) necesita un valor de color. `rules/styles.md` prohíbe `hex`, `rgb()` y
`hsl()` en los componentes: solo se usan nombres de token. La paleta de marca (`palette.css`) tiene 14
tokens de nombre fijo y no es el sitio de colores de producto: son datos del catálogo, como las
imágenes, no identidad de marca.

## Alternativas consideradas

1. **Valores en el componente** (`style={{ backgroundColor: '#7a2e3b' }}`). Prohibido por las reglas
   de estilo.
2. **Tokens CSS del proyecto** (`--color-swatch-<color>` en un archivo propio) y un mapa de nombre de
   color a clase en TypeScript. Sin cambios de BD; un color nuevo exige añadir su token.
3. **Columna en la base de datos** con el color (valor o nombre de token) por variante o producto.
   Es lo correcto a largo plazo y lo editaría el admin, pero es un cambio de esquema con migración,
   RLS y tipos, y arrastra T-021 (panel de productos).
4. **Añadir los colores a `palette.css`.** Rompe el contrato de 14 tokens de nombre fijo y mezcla
   marca con catálogo.

## Decisión

Opción 2. Un archivo `src/app/swatches.css` define `--color-swatch-<color>` en un `@theme static`, y se
importa desde `globals.css` después de la paleta. El mapa `src/lib/catalog/swatches.ts` traduce el
nombre del color a una clase de Tailwind con el nombre completo escrito (`bg-swatch-burdeos`), para
que Tailwind la genere. Los componentes solo usan esa clase, nunca un valor de color.

- Los valores son los mismos que usan las imágenes de ejemplo (`scripts/generate-placeholders.mjs`),
  para que la muestra y la foto coincidan.
- Un color **sin token** no se pinta como círculo de otro color: la ficha lo muestra como chip de texto
  (comportamiento anterior).
- Se comprueba por test que todos los colores del catálogo de ejemplo tienen token y que el CSS y el
  mapa están sincronizados.

## Consecuencias

Positivas:
- Sin cambios de esquema ni de datos.
- Los componentes siguen sin valores de color.
- Un color sin token degrada a texto, sin errores.

Negativas:
- Un color nuevo del catálogo necesita su token y su entrada en el mapa (un test avisa si falta).
- Los colores de muestra viven en el código, no en los datos: no los edita el admin.
- Si el catálogo real crece, la opción 3 (columna en BD) sería el paso siguiente; este ADR queda
  superado entonces, no roto.

## Relación con la constitución

No toca invariantes. Respeta I6 (la información no depende solo del color: cada círculo tiene nombre
accesible, el elegido lleva un anillo y hay un subtexto con el nombre) y la regla de tokens de
`rules/styles.md`. No cambia `palette.css` ni el estilo `v1-soft-commerce`.
