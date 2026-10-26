---
description: Ejecuta el flujo completo de forma autónoma (Plan -> Build -> Auditar estructura -> Pulir UI -> Tests -> Commit).
---

Actúa como Orquestador. No pidas confirmaciones intermedias.

Condiciones de parada (únicas excepciones): no hay spec aprobada o tarea
(I1), una puerta de calidad falla y no se resuelve, o una instrucción es
ambigua (`rules/process.md`). Entonces detente y dilo.

1. Lee la tarea (`sdd/tasks/T-xxx.md`) y planifica.
2. Programa el código cumpliendo los CA.
3. Ejecuta internamente la lógica de `/auditar-pagina` (comprueba que no
   falte ningún bloque).
4. Ejecuta internamente la lógica de `/pulir-ui` (aplica el Craft Floor
   y mejora el diseño).
5. Pasa typecheck, lint y los tests de la página.
6. Haz git add y git commit por separado. No hagas push. Devuelve un
   resumen de 5 líneas.
