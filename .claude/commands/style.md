---
description: Consulta o cambia el estilo del proyecto. Obligatorio antes de tocar UI.
---

## Al invocarse sin contexto

1. Lee design/styles/index.md y sdd/plans/ para saber el estilo actual.

2. Pregunta:
   ¿Con qué estilo vamos?
   - v1-soft-commerce (actual)
   - v2-immersive-3d
   - v3-editorial-dark
   - v4-dense-workspace
   - Nueva exploración

3. Según la respuesta:
   - Mismo estilo: confirma que palette.css está aprobado y pasa
     check-palette. Si no, aplica palette-rules.md primero.
   - Otro estilo existente: avisa de que es un cambio de identidad visual
     → /decide (ADR) → sustituir tokens.css. Los componentes no se tocan.
   - Nueva exploración: crea explorations/vN-slug/ con notes.md y un
     mockup mínimo. Las exploraciones no se fusionan tal cual.

## Reglas

- Un estilo aprobado es inmutable. Un cambio crea versión nueva.
- El color no forma parte del estilo: la paleta es por proyecto.
- Los componentes solo usan nombres de token.
- Nunca edites tokens.css ni palette.css desde un componente.

## Al terminar

Confirma al usuario el estilo elegido y, si aplica, recuérdale pasar
check-palette antes de escribir la primera línea de UI.
