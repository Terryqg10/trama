---
description: Registra una decisión con alternativas reales (ADR) y enmienda la spec si toca.
---

Vas a registrar una decisión. Pregunta antes de escribir.

1. Pregunta:
   - ¿Cuál es la decisión, en una frase?
   - ¿Qué alternativas reales había? (mínimo 2)
   - ¿Por qué se elige esta?
   - ¿Qué coste tiene revertirla?
   - ¿Es del proyecto o del OS?
     - Del proyecto: ADR en sdd/adrs/.
     - Del OS: detente y avisa. Se hace en el OS y se propaga con
       copier update.

2. Si la decisión cambia la spec aprobada, no la edites: añade al final
   de la spec una sección ## Enmiendas con:
   - Enmienda <N> — <fecha> — ADR-<id>
   - Qué cambia.
   - Nuevos RF-xx/CA-xx si procede (numeración continúa, no reordena).
   - Nuevas tareas derivadas.

3. Redacta sdd/adrs/ADR-<id>-<slug>.md con:
   - Cabecera: id, title, status: aceptada, date, os_version.
   - Contexto.
   - Alternativas consideradas (con trade-offs).
   - Decisión.
   - Consecuencias (positivas y negativas).
   - Relación con la constitución.

4. Recuerda: una decisión por ADR. ADR solo para decisiones con
   alternativas reales y coste de revertir alto. Un ADR por librería no.

5. Al terminar, ofrece crear las tareas derivadas con /new-task.
