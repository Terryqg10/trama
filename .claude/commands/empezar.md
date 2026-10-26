---
description: Guía paso a paso para arrancar un proyecto nuevo desde cero. Pregunta una cosa por mensaje y no avanza hasta tener respuesta.
---

Vas a guiar al usuario paso a paso para definir su proyecto y dejarlo
listo para empezar. NO escribas código de aplicación. Solo preguntas,
specs, planes y tareas.

## Reglas

1. Un paso por mensaje. No avances hasta que el usuario responda.
2. No asumas. Si falta información, pregunta.
3. No inventes datos. Marca VERIFICAR cuando dudes.
4. Respuestas concisas. Los archivos completos.
5. Al terminar, el proyecto debe tener: primera spec, primer plan,
   primera task, y opción de empezar a implementar.

## Antes de empezar

Comprueba el estado:
- Si hay specs en sdd/specs/ (que no sean _template.md): avisa y sugiere
  /start en lugar de /empezar.
- Si hay un plan en sdd/plans/: igual.
- Si no hay palette.css: la crearás tras decidir el estilo (paso 4).

Si el proyecto está vacío, continúa.

## Paso 1 — Qué y quién

Pregunta en un solo mensaje:
- ¿Qué quieres construir, en una frase?
- ¿Quién lo va a usar?

Espera respuesta. No avances.

## Paso 2 — Fuera de alcance

Con lo que has entendido, propón 2-4 puntos de fuera de alcance. Pide que
el usuario confirme, quite o añada. Espera respuesta.

## Paso 3 — Nivel y estilo

Recomienda un nivel (S/M/L) según lo hablado, con una frase de por qué.
Pregunta si lo acepta.

Muestra los 4 estilos del registro design/styles/index.md. Recomienda uno
con una frase. Pregunta cuál.

Espera respuesta.

## Paso 4 — Paleta

Pregunta si el proyecto tiene marca propia.
- Si sí: pide hex, logo o guía de marca.
- Si no: aplica design/palette-rules.md con lo que sepas (sector, tono) y
  propón una semilla razonada. El usuario veta o corrige.

Con la semilla, genera palette.css en la raíz del proyecto usando
palette.template.css del estilo elegido. Rellena la cabecera. Ejecuta
check-palette y pega la salida. Si falla algún par, ajusta la paleta y
vuelve a intentar (sin forzar valores).

Espera a que el usuario apruebe la paleta antes de continuar.

## Paso 4b — Dirección visual

Este paso ocurre SIEMPRE antes de escribir la spec o el plan (pasos 6 y
7). No se propone ni se diseña nada sin pasar antes por aquí.

Antes de proponer el estilo, pregúntame:

- ¿Tienes capturas de pantalla o URLs de webs que te sirvan de
  referencia visual (colores, tipografía, estructura)?
- Si no tienes referencias, propón 3 direcciones de arte distintas (ej.
  Minimalista suizo, Editorial clásico, Lujo oscuro) con una frase de por
  qué encajan con el sector, y espera a que elija una.

Espera respuesta. No avances sin referencias o sin una dirección elegida.
Las referencias (o la dirección elegida) se anotan en el
`## 5a. Dirección visual` del plan.

Después, pregunta en un solo mensaje:

- ¿Vas a aportar imágenes propias (fotos, logos, ilustraciones)? ¿Las
  tienes ya o llegarán después?
- Si no tienes imágenes propias, ¿qué dirección prefieres?
  - Banco de imágenes de pago (calidad, licencia, coste).
  - Banco gratuito con atribución (Unsplash, Pexels; cuidado con la
    atribución).
  - Imágenes generadas con IA (nosotros hacemos los prompts).
  - Ilustraciones vectoriales / iconos.
- ¿Qué estilo visual quieres? (natural, minimalista, editorial,
  colorido…)
- ¿Hay alguna sección que quieras destacar visualmente? (hero, ficha
  de producto, historia de marca…)

Espera respuesta.

Si el usuario no lo tiene claro, propón un punto de partida razonable
según el tipo de proyecto. No inventes imágenes, solo propón
direcciones.

Esta información va al `## 5a. Dirección visual` del plan (ver
`plans/_template.md`).

## Paso 5 — Datos, APIs, estados

Tres preguntas cortas en un solo mensaje:
- ¿Toca datos personales? (sí/no; si sí, qué y para qué)
- ¿Consume APIs externas? (cuáles)
- ¿Hay entidades con ciclo de vida (estados)? (sí/no)

Espera respuesta.

## Paso 6 — Resumen y confirmación

Muestra un resumen de todo lo decidido (objetivo, usuario, fuera de
alcance, nivel, estilo, paleta, datos, APIs, estados). Pide confirmación
antes de escribir nada.

## Paso 7 — Crear spec + plan + task

Con la confirmación, en un solo commit:

1. sdd/specs/SPEC-001-<slug>.md con todas las secciones obligatorias
   (ver rules/spec-first.md). Status: borrador. Incluye:
   - Objetivos.
   - Fuera de alcance.
   - RF-01, RF-02, ... (requisitos funcionales).
   - Requisitos no funcionales.
   - Casos límite.
   - Estados de error y vacío.
   - Máquina de estados (si aplica).
   - Riesgos de seguridad.
   - Datos y privacidad.
   - APIs externas.
   - CA-01, CA-02, ... (criterios de aceptación, Dado/Cuando/Entonces).

2. sdd/plans/PLAN-001-<slug>.md con:
   - Nivel, estilo activo, paleta (source, seed, approved_by).
   - La sección `5a. Dirección visual` con los datos recogidos en el
     Paso 4b.
   - Arquitectura, contratos, modelo de datos si aplica.
   - Estrategia de tests según nivel.
   - Riesgos y mitigaciones.

3. sdd/tasks/T-001.md con la primera tarea atómica:
   - Deriva de un CA de la spec.
   - Una sola cosa verificable.
   - Puertas que aplican.
   - Evidencia esperada.

Commit: `feat: primera spec, plan y tarea del proyecto`

## Paso 8 — Cierre

Pide al usuario que revise la spec y la apruebe. Cuando lo haga, cambia
status: borrador a status: aprobada.

Luego pregunta si quiere:
- Empezar a implementar la primera tarea (con /check y /review después).
- Parar aquí y seguir mañana con /start.

Sugiere /new-spec y /new-task para spec y tareas adicionales.
