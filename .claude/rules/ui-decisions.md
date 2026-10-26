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

## Filtros y Selectores en Móvil (Anti-sopa de botones)

- En **móvil (< 768px)**, si un filtro tiene **más de 3 opciones**, nunca
  se pintan como botones en fila. Se usa un `<select>` nativo o un
  dropdown (menú desplegable).
- En **escritorio**, si los botones caben en una sola fila sin romperse,
  se pueden usar.
- Si hay un panel de administración (v4-dense-workspace), los filtros
  siempre van en la cabecera de la tabla como selects, no como filas de
  chips.

## Diseño Premium (Solo para proyectos E-commerce)

Esta regla solo aplica si el proyecto tiene catálogo de productos o
carrito de compra.

- **Hero:** Si el estilo activo lo permite (v3-editorial-dark o
  v1-soft-commerce en su versión ancha), el Hero puede ser una imagen
  grande a sangre (full-bleed) o una tarjeta de gran tamaño. El texto
  debe ser legible (usar scrim si hay imagen de fondo).
- **Banners de interrupción:** Obligatorio incluir al menos una franja
  (ej. "Envío gratis", "Nueva colección") entre las rejillas de
  productos.
- **Categorías visuales:** Si hay más de 3 categorías, mostrar un
  carrusel horizontal o una rejilla de imágenes, no solo texto.

## Ficha de Producto (E-commerce)

- Galería con múltiples fotos (mínimo 2 ángulos).
- Selectores de color visuales (círculos) y de talla como botones
  cuadrados.
- El botón de "Añadir a la cesta" debe ser el CTA principal de la
  página.

## Investigación de UI para Componentes Complejos

Antes de construir un componente de UI complejo (calendarios,
selectores de fecha/hora, tablas de datos, paneles de filtros,
pasarelas de pago), el agente NO debe improvisar una plantilla
genérica. Debe:

1. Pensar en las 3 mejores apps del sector (ej. para reservas: Fresha,
   Booksy, Calendly).
2. Adoptar sus patrones de UX (ej. carrusel horizontal de días,
   selector de horas en píldoras, botón sticky en móvil).
3. Si el usuario tiene una captura de referencia, seguirla al pie de la
   letra.

## Diseño Editorial (Sector Premium)

Cuando el proyecto sea de un sector premium (peluquería, spa,
restaurante de autor, moda de lujo, arquitectura), el estilo
`v1-soft-commerce` NO debe aplicarse como una plantilla genérica. Se
deben seguir estas pautas:

1. **Tipografía:** Usar una fuente Serif elegante para los titulares
   (Playfair Display, Cormorant, etc.) y una Sans limpia para el cuerpo.
2. **Hero:** Evitar el típico "foto en caja + texto al lado". Usar fotos
   a sangre (100vw) con texto superpuesto o composiciones asimétricas.
3. **Listas de precios/servicios:** Evitar tarjetas blancas infladas.
   Usar listas elegantes, líneas divisorias sutiles y precios alineados a
   la derecha.
4. **Botones:** Menos es más. Usar enlaces de texto ("Reservar →") o
   botones discretos en lugar de botones de colores gigantes en cada
   bloque.

**Excepción sobre v1-soft-commerce y Geist:**
Si un proyecto usa `v1-soft-commerce` pero pertenece a un sector premium
(peluquería, spa, restaurante de autor), se aplicarán las pautas
editoriales (fuente serif, hero a sangre) POR ENCIMA de las reglas del
estilo, y esta desviación (junto con el cambio de tipografía) deberá
quedar registrada obligatoriamente en la sección `## Decisiones de UI`
del `plan.md`.

## Estructura de la Tarjeta de Producto (E-commerce)

En las tarjetas de producto (listados, catálogo, home), queda
terminantemente prohibido tapar la imagen del producto con botones,
paneles o textos superpuestos (a excepción de los badges de estado como
"Nuevo" o "-20%").

La estructura vertical obligatoria de arriba a abajo es:

1. **Imagen:** Limpia, con relación de aspecto fija (ej. 3:4) y
   `object-cover`.
2. **Texto:** Título del producto y precio (con el precio anterior
   tachado si hay oferta).
3. **Colores:** Miniaturas visuales (círculos o cuadrados) si hay más de
   una variante.
4. **Tallas:** Selector de tallas en botones cuadrados. Las tallas
   agotadas deben verse tachadas o con opacidad reducida y no deben ser
   clicables.
5. **Botón de acción:** "Añadir a la cesta" a ancho completo. Si no se
   ha seleccionado talla, debe estar deshabilitado o indicar que se
   elija una talla.

## Buscador Persuasivo (Typeahead) y Seguridad

**Aplica solo a proyectos con catálogo de productos (e-commerce).** Los
proyectos de servicios (peluquería, restaurantes) solo necesitan un
buscador simple si su contenido lo requiere, sin miniaturas de producto.

- **Comportamiento:** El header debe incluir un buscador visible en
  escritorio y como icono en móvil. Debe usar un *debounce* (300ms) para
  consultar una API interna en tiempo real a partir de 2 caracteres.
- **Seguridad (Inyecciones):** La API de búsqueda (`/api/search`) debe
  validar estrictamente la entrada usando Zod antes de consultar a la
  base de datos. La lista blanca debe permitir letras (incluyendo
  acentos), números, espacios y guiones, con una longitud máxima (ej. 50
  caracteres).
  *Regex sugerido:* `/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-]{2,50}$/`
- **UI del Dropdown:** Mostrar miniatura, nombre y precio del producto.
  Si no hay resultados, mostrar un mensaje amigable.
- **Móvil:** Al pulsar el icono, se abre un overlay a pantalla completa
  para buscar.

## Carrito de la Compra (Mini-Cart / Cart Drawer)

- En proyectos e-commerce, el icono del carrito NO debe llevar a una
  página separada por defecto.
- Al añadir un producto a la cesta, debe abrirse automáticamente un
  **Cart Drawer lateral** (deslizante desde la derecha).
- **UI del Drawer:** Debe mostrar la lista de productos (miniatura,
  nombre, talla/color), los controles de cantidad (+/-) y el botón de
  eliminar.
- **Pie del Drawer:** Un resumen claro del total, un mensaje si hay
  ahorro por descuentos, el botón "Tramitar compra" (CTA principal) y el
  botón "Seguir comprando" (cierra el drawer).
- **Accesibilidad:** Bloquear el scroll del body cuando está abierto,
  atrapar el foco (Focus trap), cerrar con `Esc` y con clic en el fondo
  oscuro. Usar `role="dialog"` y `aria-modal="true"`.
- **Animación:** Usar transiciones suaves (`transform`), respetando
  `prefers-reduced-motion`.
- **El botón "Tramitar compra" del Drawer debe llevar SIEMPRE a una
  página de checkout independiente (ej. `/checkout`), nunca realizar el
  pago ni la recogida de datos dentro del propio Drawer.** El Drawer es
  solo un resumen rápido; el checkout es un entorno dedicado, seguro y
  sin distracciones.

## Búsqueda y Consistencia de Componentes

- La página de resultados de búsqueda (`/buscar?q=...`) debe usar
  **exactamente el mismo componente de tarjeta de producto** que el
  catálogo principal. Prohibido crear una tarjeta simplificada solo para
  la búsqueda. El usuario debe poder añadir al carrito, ver tallas y
  colores desde los resultados de búsqueda.
- La página de "Ofertas" debe tener un banner visual de cabecera y
  reutilizar el grid del catálogo filtrado por descuentos. No debe ser
  una página vacía.

## Área de Usuario (Mi Cuenta) y Autenticación

- **Dashboard de Cuenta:** La página `/cuenta` debe usar un layout de
  barra lateral (Sidebar) con navegación clara: Mis datos, Mis pedidos,
  Mis direcciones, Club (programa de fidelización), Cerrar
  sesión.
- **Direcciones:** Es obligatorio incluir una sección de "Mis
  direcciones" con opción de añadir/editar. Las compras recurrentes no
  deben obligar a reescribir la dirección.
- **Fidelización y Referidos:** Todo proyecto e-commerce debe tener
  previsto (aunque sea en fase 2) un sistema de puntos (Club) y un
  sistema de "Recomienda y gana".

## Autenticación y Menú de Usuario

- **Sin sesión:** Al hacer clic en el icono de perfil de la cabecera, se
  abre un Modal de Login/Registro (nunca redirige a una página vacía).
  El modal debe tener diseño Split (imagen de marca + formulario).
- **Con sesión:** Al hacer clic, se despliega un menú flotante
  (dropdown) accesible (`role="menu"`, `aria-expanded`, cierre con Esc
  y clic fuera).
- **Contenido del menú (adaptable al tipo de proyecto):**
  - Cabecera: "Hola, [Nombre]".
  - **Si es E-commerce:** Mis Datos, Mis Pedidos, Club (programa de
    fidelización), Cerrar Sesión.
  - **Si es Servicios (ej. peluquería):** Mis Datos, Mis Citas, Cerrar
    Sesión.
  - El resto de proyectos adapta los enlaces a su lógica de negocio.

## Icono del Carrito y Contador (Solo E-commerce)

- El icono del carrito en la cabecera debe incluir un contador (badge)
  con el número total de artículos.
- El badge debe estar en la esquina superior derecha y ocultarse cuando
  el carrito esté vacío.
- **Contraste:** El texto del badge debe usar el token `text-accent-fg`
  (no blanco fijo) para garantizar que cumple el contraste AA (I6) sea
  cual sea la paleta del proyecto.
- El enlace del carrito debe actualizar su `aria-label` dinámicamente
  (ej. "Carrito, 3 artículos").
- El badge debe tener `pointer-events-none` para no bloquear el clic en
  el icono.

## Secciones de Productos en la Home (E-commerce)

- Las secciones de "Novedades" o "Destacados" en la portada con **más de
  4 productos** deben usar un **Carrusel horizontal (Slider)** con efecto
  "Peek" (mostrar un trocito del siguiente producto) para ahorrar espacio
  vertical e invitar a la interacción. En escritorio, el carrusel debe
  mostrar 4 productos completos. En móvil, debe mostrar entre 1.2 y 2
  productos visibles.
- Si la sección tiene **4 productos o menos**, se permite y recomienda
  una **cuadrícula estática (Grid)**, ya que no abruma visualmente.
- **Navegación del carrusel:**
  - En **escritorio**, se usan flechas laterales (pueden aparecer
    sutilmente en hover).
  - En **móvil**, la navegación es mediante **desplazamiento táctil
    (swipe)** nativo. No se deben mostrar flechas en móvil.
- Respetar `prefers-reduced-motion` en las transiciones.

## Carrito Avanzado (Solo E-commerce)

El Cart Drawer o página de carrito debe incluir cuatro elementos para
maximizar la conversión, con estas salvaguardas:

1. **Código Promocional:** Un input colapsable (acordeón). Toda
   validación debe hacerse en el servidor usando Zod (I5) y debe incluir
   un sistema de rate-limiting (ej. máximo 3 intentos por minuto) para
   evitar fuerza bruta.
2. **Iconos de Pago:** Mostrar los logotipos de las pasarelas
   soportadas. **Prohibido dibujar los SVG a mano.** Se deben usar
   librerías de iconos oficiales (ej. `simple-icons`) o los kits de marca
   oficiales para cumplir con las guías de uso. (Nota: librerías como
   simple-icons NO incluyen los logos de Visa ni Mastercard por
   restricciones de sus titulares. Para esos dos, se deben usar los kits
   oficiales de cada marca, o SVG locales descargados de dichos kits;
   nunca SVG dibujados a mano).
3. **Mensaje de Seguridad:** El texto "Pago seguro/cifrado" solo se
   mostrará si el proyecto tiene una pasarela real (Stripe, etc.)
   operando por HTTPS. En proyectos demo, se debe indicar claramente
   ("Entorno de demostración, no se realizan cargos").
4. **Cross-selling (Completa tu carrito):** Fila o carrusel horizontal
   de 2-3 productos complementarios con botón rápido de "Añadir".

## El Craft Floor (Suelo de Calidad Impeccable)

El Craft Floor es el estándar mínimo de calidad. Se aplica siempre, pero
**se adapta a los tokens del estilo activo**:

1. **Cero genéricos de Tailwind:** Prohibido usar `shadow-md`, `gray-500`
   o `blue-600`. Se usan SIEMPRE los tokens del sistema (`shadow-card`,
   `text-fg-muted`, `bg-accent`).
2. **Espaciado armónico:** Paddings y márgenes múltiplos de 4 u 8. Si el
   estilo exige densidad (ej. v4), se aplican los tokens de densidad del
   estilo.
3. **Tipografía con intención:** Titulares con `tracking-tight` y
   `leading-tight`. Párrafos con `leading-relaxed`.
4. **Micro-interacciones basadas en tokens:** Los hovers usan la duración
   y el easing del estilo (`var(--duration-base)`, `var(--ease-soft)`),
   NUNCA valores fijos como `duration-300`. Siempre respetando
   `prefers-reduced-motion`.
