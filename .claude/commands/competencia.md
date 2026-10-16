---
description: Guía la investigación de competencia. Imprime un prompt para Claude.ai, recoge el análisis, lo guarda como exploración y deriva ADR, spec y tareas.
---

Vas a ayudar al usuario a analizar la competencia de su proyecto. El
flujo tiene tres fases. NO hagas las tres de golpe: una por turno.

## Antes de empezar

Comprueba que existe `sdd/` en el proyecto. Si no, avisa.

## Fase 1 — Preparar el prompt para Claude.ai

Pregunta al usuario:

1. ¿Cuál es el rubro? (ej. "tienda de ropa online", "restaurante",
   "SaaS de contabilidad")
2. ¿Cuál es el mercado? (ej. "España", "online global", "Madrid")
3. ¿Cuál es el público objetivo? (una frase: edad, perfil, presupuesto)
4. ¿Cuál es el tono que quieres para tu proyecto? (cercano / premium /
   minimalista / …)
5. ¿Conoces ya 3-5 competidores directos? (URL + una frase de qué es
   cada uno). Si no conoces ninguno, dilo y el análisis los propondrá.
6. ¿Vas a aportar capturas de pantalla? (sí/no) — recomendado sí: el
   análisis visual con capturas es la mitad del valor.

Con las respuestas, genera un bloque de prompt para que el usuario lo
pegue en Claude.ai (con Opus o Sonnet). El prompt debe:

- Actuar como consultor de producto y UX del rubro.
- Pedir dos grupos de webs: competidores directos (5) y referentes de
  sector (4), mezclando líderes y nicho.
- Analizar cada web con este esquema exacto:
  - Home / hero: mensaje principal, imagen, CTA.
  - Navegación: estructura, jerarquía.
  - Estructura de la home: secciones y orden.
  - Búsqueda y filtros: cómo se busca, filtros disponibles.
  - Ficha / detalle: qué información dan y cómo.
  - Flujo de conversión: pasos hasta comprar o reservar.
  - Devoluciones y confianza: política, garantías, reseñas.
  - Tono del copy: formal / cercano / premium / divertido, con citas
    cortas.
  - Sostenibilidad / valores: si comunican algo más.
  - Detalles que destacan (2-3).
  - Debilidades (1-3).
- Al final:
  - Patrones transversales: qué se repite, qué se evita, diferencias
    por segmento.
  - Propuestas adoptables priorizadas (8-12): qué patrón, por qué
    encaja, cómo aplicarlo.
  - Prohibiciones explícitas: qué NO copiar (textos, imágenes, logos,
    estructura muy específica, código).
  - Preguntas abiertas (3-5): cosas que no se resuelven solo con la
    investigación.
- Reglas: en español, conciso pero completo, tablas donde ayuden,
  marcar [VERIFICAR] si no se puede comprobar, no citar más de 10
  palabras seguidas de cada web.
- Pausa entre Fase 1 (propuesta de lista) y Fase 2 (análisis): espera
  confirmación del usuario antes de analizar.

Imprime el prompt en un bloque de código para que el usuario lo copie.

Al final, dile:

  Copia el prompt y pégalo en Claude.ai (chat nuevo, modelo Sonnet u
  Opus). Cuando tengas el análisis completo, vuelve aquí y dime
  "listo el análisis".

Espera a que el usuario vuelva.

## Fase 2 — Volcar el análisis como exploración

Cuando el usuario diga que tiene el análisis:

1. Pregunta el nombre corto de la exploración (ej. "competencia-ropa").
   Con él, forma `EXP-001-<nombre>`.

2. Pide al usuario que pegue el texto completo del análisis.

3. Crea la carpeta `sdd/explorations/EXP-001-<nombre>/`.

4. Guarda el análisis en `sdd/explorations/EXP-001-<nombre>/notes.md`
   con la cabecera:

   ---
   id: EXP-001-<nombre>
   title: Análisis de competencia — <rubro>
   status: activa
   created: <fecha>
   updated: <fecha>
   ---

5. Pregunta si el usuario quiere aportar capturas de pantalla (hero,
   nav, ficha, checkout). Si las aporta, las guarda en la misma carpeta
   como `01-hero-competidor1.png`, etc. No es obligatorio.

6. Commit: `docs: exploración EXP-001-<nombre> (competencia)`.

## Fase 3 — Síntesis: ADR + spec + tareas

Lee el `notes.md`. Propón al usuario una tabla:

| Hallazgo | ¿Adoptamos? | Cómo | Va a |
|---|---|---|---|
| Patrón X | Sí | ... | ADR-xxx / spec / T-xxx |
| Patrón Y | No | — | — |
| ... | ... | ... | ... |

Reglas:
- Los hallazgos que cambien la spec o la arquitectura → ADR con `/decide`.
- Los que enriquezcan la spec → enmienda con `/decide` también (marca
  "Enmienda N en SPEC-xxx").
- Los que sean tareas concretas → `/new-task`.

Cuando el usuario confirme la tabla:
- Crea los ADR que correspondan.
- Crea o enmienda la spec.
- Crea las tareas.
- Commit: `feat: hallazgos de EXP-001 aplicados (ADR, spec, tareas)`.

Cierra con:

  Exploración EXP-001 cerrada. Lo que se adopta vive ahora en ADRs,
  spec y tareas. Lo demás queda como memoria histórica en
  sdd/explorations/.

## Reglas

- No inventes hallazgos si el usuario no ha aportado el análisis.
- No copies fragmentos largos de webs competidoras en ningún archivo.
- No confundas "exploración" (desechable, cuaderno) con "spec"
  (contrato que dirige la implementación). Lo que importa pasa por
  /decide.
- Si el proyecto tiene un estilo visual activo (mira
  sdd/plans/PLAN-xxx.md), avisa si algún hallazgo choca con ese estilo.
