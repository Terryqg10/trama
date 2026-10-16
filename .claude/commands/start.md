---
description: Lee el estado del proyecto y dice qué toca hacer ahora. Si el proyecto está vacío, sugiere /empezar.
---

Vas a orientar la sesión. No escribas código todavía.

## Antes de nada: ¿es la primera vez?

Comprueba si el proyecto está vacío:

- No hay specs en sdd/specs/ (que no sean _template.md).
- No hay planes en sdd/plans/ (que no sean _template.md).
- No hay tareas en sdd/tasks/ (que no sean _template.md).
- No hay palette.css en la raíz del proyecto.

Si las CUATRO son ciertas, el proyecto está recién instanciado.
Devuelve EXACTAMENTE esto:

  ## Estado
  Proyecto recién instanciado. Todavía no hay nada definido.

  ## Qué toca ahora
  Antes de escribir código, hay que definir qué vas a construir. El
  comando /empezar te guía paso a paso: pregunta objetivo, usuario,
  alcance, nivel, estilo, paleta, datos y APIs, y al final crea la
  primera spec, el plan y la primera tarea.

  ¿Ejecutamos /empezar ahora?

Y detente. No sigas con el análisis normal. Espera respuesta.

## Si el proyecto ya tiene contenido: análisis normal

1. Lee, en este orden:
   - docs/constitution.md
   - design/styles/index.md
   - sdd/plans/ (plan activo: style, rigor_level, palette)
   - sdd/specs/ (última spec aprobada)
   - sdd/tasks/ (tareas abiertas)
   - sdd/adrs/ (últimos ADRs)
   - sdd/reviews/ (cierres recientes)

2. Devuelve un resumen de una pantalla máximo:

   ## Estado
   - Proyecto: <nombre>
   - Nivel: S | M | L
   - Estilo actual: vX-<slug>@<versión> (palette: <aprobado|pending>)
   - Spec activa: <slug> (<n> RFs, <m> CAs)
   - Tareas abiertas: <lista>
   - Último ADR: <id> <título>

   ## Qué toca ahora
   <La tarea más razonable, con su T-xx y los CA que cubre. O "no hay
   tareas abiertas".>

   ## Bloqueos
   <palette sin aprobar, ADR pendiente, spec sin aprobar, dependencia
   externa.>

3. Pregunta si seguimos con esa tarea o si quieres otra cosa.

No empieces a implementar. Espera confirmación.

## Si hay plan pero no paleta

Avisa: "Hay plan pero no hay palette.css. Sin paleta válida no se puede
tocar UI. ¿Ejecutamos /style ahora para deducirla?"

Espera respuesta.
