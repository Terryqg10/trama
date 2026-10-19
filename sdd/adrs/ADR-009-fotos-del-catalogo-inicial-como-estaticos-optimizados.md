---
id: ADR-009
title: Las fotos del catálogo inicial y del Hero son archivos estáticos optimizados en public/images/, no Supabase Storage
status: aceptada
date: 2026-10-19
os_version: 0.6.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda]
---

# ADR-009 — Fotos del catálogo inicial como estáticos optimizados

## Contexto

El catálogo de ejemplo usa SVG placeholder en `public/products/` (generados por `scripts/generate-placeholders.mjs`).
Ya hay fotos reales de seis productos que coinciden con productos del seed y dos fotos de marca para el Hero de la
Home. T-034 (Enmienda 7 del plan) prevé la subida de imágenes desde el panel a Supabase Storage, pero aún no está
hecha y requiere un bucket, una migración y subida validada en servidor. El repositorio es público.

## Alternativas consideradas

1. **Estáticos optimizados en `public/images/` (versionados).** Un script con `sharp` convierte los originales a
   AVIF/WebP con un tamaño máximo; `next/image` sirve cada tamaño. Los originales se quedan fuera de Git.
   Funciona hoy, sin cuotas ni bucket; cada foto nueva exige un commit.
2. **Todo en Supabase Storage (hacer T-034 antes).** Es el camino del panel y no pesa en el repo, pero retrasa las
   fotos reales hasta tener bucket, migración, políticas y subida validada, y añade dependencia de cuotas del plan.
3. **Mantener los SVG placeholder.** Cero trabajo, pero la tienda no puede enseñarse con imágenes reales.

## Decisión

La alternativa 1 para el catálogo inicial y el Hero. Los originales viven en `public/images/raw/` (en
`.gitignore`) y `pnpm optimize-images` escribe en `public/images/products/` y `public/images/hero/`. T-034 sigue
vigente para las altas de productos desde el panel; no se sustituye.

## Consecuencias

Positivas:
- Fotos reales ya, sin depender de Storage.
- Repo ligero: solo entran las versiones optimizadas, nunca los originales.
- El flujo es reproducible y funciona en Windows (Node).

Negativas:
- Una dependencia de desarrollo nueva (`sharp`).
- Dos orígenes de imagen conviven (estáticos y, después, Storage): el CHECK de `product_images.path` y el esquema
  Zod aceptan `/products/` (SVG heredados) e `/images/products/` hasta retirar los SVG.
- Cada foto nueva del catálogo inicial es un commit.

Coste de revertir: bajo. Las rutas son datos (`product_images.path`); volver a Storage es cambiar esas filas.

## Relación con la constitución

- I5: la ruta de la imagen sigue validada con Zod y con el CHECK de la BD.
- I8: el script es Node, sin sh/bash.
- I6: cada imagen lleva texto alternativo no vacío.
- Seguridad: los originales no se versionan; no se guardan datos personales.
