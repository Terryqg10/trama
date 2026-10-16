---
description: Crea una tarea atómica a partir de una spec aprobada.
---

Vas a crear una tarea. Pregunta antes de escribir.

1. Pregunta:
   - ¿De qué spec sale? (slug)
   - ¿Qué criterios de aceptación (CA-xx) cubre? (puede ser uno solo)
   - ¿Es atómica? (una sesión, sin mezclar capas)

2. Si la spec está en borrador, detente: primero se aprueba.

3. Redacta sdd/tasks/T-<id>.md con:
   - Cabecera: id, spec, ca_cubiertos, nivel (S/M/L), status: pendiente.
   - Contexto (2-3 líneas).
   - Cambio previsto (una frase).
   - Fuera de alcance de esta tarea.
   - Criterios de aceptación (copiados de la spec, con su CA-xx).
   - Puertas que aplican (según rules/quality-gates.md y el nivel).
   - Evidencia esperada: qué comando pegarás en sdd/reviews/T-<id>.md.

4. Al terminar, ofrece empezar la tarea. Recuerda /check antes de /review.

La tarea es atómica. Si al redactarla ves que cubre varios temas,
divídela.
