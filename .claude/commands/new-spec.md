---
description: Crea una spec nueva desde la plantilla del OS.
---

Vas a crear una spec. Pregunta antes de escribir.

1. Pregunta:
   - ¿Qué problema resuelve esta spec, en una frase?
   - ¿Qué no entra en el alcance?
   - ¿Quién la usa y para qué?
   - ¿Toca datos personales? (sí/no)
   - ¿Consume APIs externas? ¿Cuáles?
   - ¿Hay entidades con ciclo de vida (estados)? (sí/no)

2. Con las respuestas, redacta sdd/specs/<slug>.md siguiendo la plantilla
   sdd/specs/_template.md. Todas las secciones obligatorias.

3. IDs:
   - RF-01, RF-02, … para los requisitos funcionales.
   - CA-01, CA-02, … para los criterios de aceptación. Dado/Cuando/Entonces.
   - Los CA deben ser verificables por un test o una comprobación manual.

4. Marca status: borrador. Cuando esté lista, pide al usuario que la
   apruebe. No pasa a aprobada sin su visto bueno.

5. Al terminar, ofrece crear la primera tarea con /new-task.

Cosas que no debes hacer:
- Inventar datos, versiones o términos legales. VERIFICAR y listo.
- Añadir funcionalidad fuera de alcance.
- Escribir código de aplicación.
