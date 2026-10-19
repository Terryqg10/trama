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

## Invertir visualmente = invertir el DOM

Cuando el orden visual de una fila o grupo debe ser distinto al del
código, NUNCA se invierte con CSS (`flex-row-reverse`, `order`,
`direction`). Se invierte el orden del propio DOM.

Motivo: la tabulación (Tab) sigue el orden del DOM, no el visual. Si
el visual dice "Limpiar | Aplicar" pero el DOM dice "Aplicar | Limpiar",
quien navega con teclado pulsará Aplicar cuando cree que pulsa Limpiar.
Rompe WCAG 2.4.3 (Focus Order) y 1.3.2 (Meaningful Sequence).

Si el diseño pide otra cosa, se cambia el DOM y se adapta la lógica
que lo recorre.

## Iconos de acción que deben funcionar sin JavaScript

Cuando un icono (menú, abrir panel, cerrar overlay) tenga que
funcionar también sin JavaScript, se implementa como enlace:

    <a href="#nombre-del-estado">...</a>

NO como botón:

    <button onClick={...}>...</button>

El enlace funciona sin JS mediante CSS `:target`. Con JS, un pequeño
componente cliente sincroniza el estado de React con el hash.

El hash debe ser específico (`#menu-movil`, `#cerrar-filtros`), no `#`
vacío. Un `#` sin destino rompe tests de accesibilidad y navegación.

Patrón completo documentado en `plans/_template.md`, sección "Notas
técnicas".

## Orden y Layout Macro

- Prohibido dejar columnas vacías o desequilibradas. Si una página tiene
  poco contenido, usa un grid de 2 columnas: una para el contenido y otra
  para un elemento visual de apoyo (imagen, tarjeta, mapa). No dejes
  media pantalla en negro.
- Los headers deben ser "sticky" (fijos al hacer scroll) por defecto en
  todos los estilos, a menos que una exploración visual diga lo contrario.
- Los enlaces no llevan subrayados genéricos del navegador. Usan el color
  de acento (accent-text) y/o transiciones en hover.

## Menús y Navegación

- Prohibido usar numeraciones (01, 02, 03) en los menús de navegación
  (cabecera, menú móvil, footer) a menos que sea una exploración visual
  explícita.
- Los menús móviles no usan el tamaño `text-display` (es demasiado grande
  y agresivo). Usa `text-2xl` o `text-3xl` con buen espaciado.
- Los botones flotantes de acción (FAB) para llamar o reservar solo se
  muestran en móvil (`lg:hidden`). En escritorio ocupan demasiado espacio.
