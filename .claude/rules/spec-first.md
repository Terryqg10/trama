# rules/spec-first.md

El flujo es spec → plan → tasks → implement → review. Nada se salta.

## Antes de tocar código

1. Existe `sdd/specs/<slug>.md` y está aprobada (`status: aprobada`).
2. Existe `sdd/tasks/T-<id>.md` derivada de un CA de esa spec.
3. La tarea es atómica: un cambio verificable en una sesión, sin mezclar capas, con CA propios.

Si falta cualquiera de las tres, para y propón crearlas.

## Trazabilidad

- RF-xx — requisito funcional. Vive en la spec.
- CA-xx — criterio de aceptación. Dado/Cuando/Entonces. Referencia su RF.
- T-xx — tarea. Vive en sdd/tasks/, referencia sus CA.
- test-xx — test concreto. Vive en el código, referencia su CA.

Cada CA tiene un test o una comprobación manual documentada.

## Spec: secciones obligatorias

1. Objetivos.
2. Fuera de alcance.
3. Requisitos funcionales (RF-xx).
4. Requisitos no funcionales.
5. Casos límite.
6. Estados de error y vacío en la UI.
7. Máquina de estados (si hay entidades con ciclo de vida).
8. Riesgos de seguridad.
9. Datos y privacidad.
10. Términos de servicio de cada API externa.

## Cambios

Una spec aprobada no se edita. Se enmienda con /decide: ADR + nota de
enmienda + nuevas tareas.

## Exploration no es spec

`explorations/vN-slug/` son desechables. Nunca se fusionan tal cual.

## No cambies un CA para que pase un test

Un CA es un requisito. Un test es la verificación de ese requisito.
Si un test falla, hay dos opciones legítimas:

1. El código no cumple el CA → se arregla el código.
2. El test no verifica bien el CA (método no fiable, frágil,
   dependiente del entorno) → se cambia el **método de verificación**
   con una enmienda documentada. El CA se queda igual.

Lo que NUNCA se hace:

- Cambiar el CA para que el test pase.
- Quitar el test y dejar el CA sin verificación.
- Marcar el CA como cubierto sin evidencia real.

Ejemplo real: un CA pedía "el navegador no avisa de LCP sin prioridad".
El test que lo verificaba fallaba 1 de cada 6 veces por timing del
navegador. La solución no fue cambiar el CA (sigue diciendo lo mismo),
sino cambiar la verificación: la parte dependiente de timing pasa a
comprobación manual documentada en la review. El CA es el mismo.
