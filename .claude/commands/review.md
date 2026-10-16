---
description: Cierra una tarea con evidencia. Si algo falla, vuelve a pendiente.
---

Vas a cerrar una tarea. No es una afirmación: es un registro de evidencia.

1. Identifica la tarea (T-xx) que se está cerrando.

2. Comprueba que /check se ha ejecutado en esta sesión y que todas las
   puertas aplicables pasan. Si alguna falla:
   - Detente.
   - Anota el fallo en sdd/reviews/T-xx.md como problema conocido.
   - Marca la tarea como vuelve a pendiente.
   - No la cierres.

3. Rellena sdd/reviews/T-xx.md:

   # Review — T-xx

   - Tarea: T-xx <título>
   - Spec: <slug>
   - Nivel: S | M | L
   - Estado: cerrada | vuelve a pendiente

   ## Criterios de aceptación cubiertos
   | CA | Estado | Evidencia |
   |---|---|---|
   | CA-01 | ✅ | test xxx.test.ts + salida del comando |

   ## Comandos ejecutados
   Pega la salida real de cada comando (tsc, lint, build, tests, etc.).

   ## Checklist de interfaz (si aplica)
   - [ ] Logo enlaza a /
   - [ ] Modales cerrables
   - [ ] Cada botón tiene acción
   - [ ] Cero enlaces muertos
   - [ ] Navegación definida

   ## Accesibilidad
   - [ ] axe sin violaciones graves
   - [ ] prefers-reduced-motion respetado

   ## Estilo
   - [ ] check-palette OK
   - [ ] Sin hex ni valores arbitrarios en componentes

   ## Problemas conocidos
   <Lista o "ninguno".>

   ## Datos y privacidad
   <Si se tocaron datos personales, actualización en la spec. O "no aplica".>

4. Recuerda al usuario:
   - Actualizar la documentación de conocimiento si hubo decisión de
     arquitectura.
   - Que la sección "Datos y privacidad" de la spec esté al día.

5. Si la tarea queda cerrada, ofrece /start para pasar a la siguiente.

Nunca rellenes review.md sin haber ejecutado los comandos en esta sesión.
Pegar salidas inventadas está prohibido.
