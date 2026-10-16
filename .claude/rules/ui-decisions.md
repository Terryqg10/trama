# rules/ui-decisions.md

Cuando una decisión de UI contradice la convención del sector, hay que
documentarla. No basta con "lo hice así porque es más simple".

## Convención del sector

Existen convenciones fuertes en cada tipo de web. Ejemplos:

- **E-commerce:** filtros en columna lateral en escritorio, panel
  deslizante en móvil. Carrito en icono arriba a la derecha. Búsqueda
  arriba. Precio y disponibilidad siempre visibles en la ficha.
- **Restaurante:** horarios y ubicación visibles sin scroll. Reserva
  con un clic desde el hero. Teléfono y WhatsApp accesibles.
- **SaaS / herramienta:** sidebar de navegación persistente. Acciones
  primarias arriba a la derecha. Búsqueda global con atajo.
- **Blog / editorial:** título grande, autor y fecha visibles, ancho de
  lectura limitado. Comentarios al final.

Estas convenciones existen porque millones de usuarios las esperan. No
son "gustos": son la fricción cero. Un usuario que llega a tu tienda
espera encontrar el filtro donde lo encuentra en Zalando.

## Regla

Antes de cerrar cualquier tarea de UI:

1. **Si tu decisión coincide con la convención del sector**, no hace
   falta justificar nada.

2. **Si tu decisión se aparta de la convención**, tienes que
   justificarlo en `sdd/plans/` bajo la sección `## Decisiones de UI`,
   con:
   - Qué convención se rompe.
   - Por qué (no vale "es más simple" o "es más rápido").
   - Qué gana el usuario.
   - Si es reversible.

3. **Si no sabes cuál es la convención**, investígalo. Se busca
   (Claude.ai, análisis de 3-5 competidores), no se adivina.

## Prohibido

- Usar "por simplicidad" como justificación de una decisión de UI que
  contradice la convención del sector. Si lo que querías decir es "no me
  apetece hacerlo bien", no vale. Si lo que querías decir es "esta
  convención no encaja con este proyecto y aquí está el porqué", eso sí
  vale.

- Presentar una decisión de UI simplificada sin mencionarla. Si te
  desvías, se dice. Se documenta. Se decide.

## Cómo se comprueba

- Antes de cerrar la tarea, si hubo decisión de UI no convencional, se
  verifica que exista la entrada en `sdd/plans/` bajo `## Decisiones de
  UI`.
