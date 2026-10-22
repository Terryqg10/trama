---
id: SPEC-002-filtros-catalogo
title: Filtros del catálogo (rediseño UX)
status: aprobada
rigor_level: L
created: 2026-10-16
updated: 2026-10-16
---

# SPEC-002 — Filtros del catálogo (rediseño UX)

## 1. Objetivos

Rediseñar el filtro del catálogo para que siga la convención del sector
e-commerce: columna lateral en escritorio, drawer en móvil, y chips que
se aplican al hacer clic (con degradación sin JavaScript). Sustituir el
comportamiento actual (panel <details> encima del catálogo, aplicación
solo con botón) que rompe la convención y añade fricción.

## 2. Fuera de alcance

- Búsqueda por texto libre dentro del catálogo (ya existe, no se toca).
- Ordenación por relevancia algorítmica. Se mantienen las opciones
  actuales (novedades, precio, nombre).
- Filtros por disponibilidad en tiempo real (stock). Queda para SPEC-003.
- Filtros por rango de tallas múltiples (solo se elige una talla).
- Guardar filtros entre sesiones.

## 3. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | En escritorio (≥ --bp-lg), los filtros se muestran en columna lateral izquierda, sticky, con ancho fijo. |
| RF-02 | En móvil (< --bp-md), los filtros se muestran en un drawer a pantalla completa que no empuja el catálogo. |
| RF-03 | Los chips de filtro (categoría, ocasión, talla, color) se aplican al hacer clic, sin necesidad de pulsar "Aplicar". |
| RF-04 | Los campos de rango (precio mínimo, precio máximo) requieren pulsar "Aplicar" para evitar peticiones por cada tecla. |
| RF-05 | El contador de filtros activos aparece en la cabecera del panel (escritorio) y junto al botón "Filtros" (móvil). |
| RF-06 | El botón "Limpiar" resetea todos los filtros manteniendo el orden actual. |
| RF-07 | Sin JavaScript, el filtro funciona como un <form method="get"> tradicional con botón "Aplicar". |
| RF-08 | El panel de filtros está visible por defecto en escritorio (no plegado). En móvil se abre con un botón. |
| RF-09 | Un valor de filtro inválido en la URL se ignora sin mostrar alerta ni romper la página. |

## 4. Requisitos no funcionales

- Accesible: navegable con teclado, `aria-*` correctos, foco visible,
  chips como `<a>` o `<button>` con `aria-pressed` cuando aplican.
- Sin recarga completa al pulsar un chip (con JS activo).
- Sin recarga completa al abrir/cerrar el drawer en móvil.
- Sin scroll horizontal a 320, 375, 768 y 1280 px (regla del OS).
- Tiempo de carga del catálogo: ≤ 2 s en 4G.

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Ningún filtro activo | El panel muestra todos los chips en estado neutro. Contador: no se muestra o "0". |
| Filtro activo sin resultados | El catálogo muestra EmptyState con "No hay productos con estos filtros". Botón "Limpiar filtros" visible. |
| Valor no válido en URL (ej. talla=XXXL) | Se ignora. La página carga sin ese filtro. No hay alerta. |
| Combinación de filtros que no encaja (ej. talla=XS + categoría=abrigos) | Lista vacía. EmptyState invita a limpiar. |
| Filtro de precio con min > max | Se ignora el min (o el max). No rompe. |
| JavaScript desactivado | El form funciona. Los chips no se aplican al clic, solo al pulsar "Aplicar". |

## 6. Estados de error y vacío en la UI

| Pantalla / flujo | Vacío | Cargando | Error |
|---|---|---|---|
| Catálogo | EmptyState con mensaje y CTA "Limpiar filtros" | Skeleton con forma del grid | EmptyState con mensaje de error y reintentar |
| Panel de filtros | Todos los chips en estado neutro | No aplica (datos ya cargados) | No aplica |
| Drawer móvil | Igual que el panel de escritorio | No aplica | No aplica |

## 7. Máquina de estados

No aplica. Los filtros se codifican en la URL (searchParams), no tienen
estado propio en el cliente.

## 8. Riesgos de seguridad

Ninguno específico. Los parámetros de URL se validan en
`parseCatalogParams`.

## 9. Datos y privacidad

Los filtros se guardan en la URL (query params), no en base de datos.
No hay datos personales implicados.

## 10. APIs externas

Ninguna.

## 11. Criterios de aceptación

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-01 | RF-01 | Un usuario en escritorio en /mujer | Carga la página | Ve los filtros en columna lateral izquierda, no encima del catálogo | Test e2e a 1280 px: `page.locator('[data-testid="filters-sidebar"]')` visible, `[data-testid="filters-panel-top"]` no existe |
| CA-02 | RF-02 | Un usuario en móvil en /mujer | Pulsa "Filtros" | Se abre un drawer a pantalla completa | Test e2e a 375 px: drawer visible con `aria-modal="true"` |
| CA-03 | RF-03 | Un usuario con JS activo | Pulsa un chip "Pantalones" | El catálogo se filtra sin recargar la página | Test e2e: `page.click('chip')` + esperar cambio en URL + esperar cambio en grid |
| CA-04 | RF-04 | Un usuario | Escribe 50 en precio máximo y sale del campo | El catálogo NO se filtra hasta pulsar "Aplicar" | Test e2e: tras escribir, la URL no cambia |
| CA-05 | RF-05 | Un usuario con 2 filtros activos | Carga la página | Ve "2 activos" junto al título del panel | Test e2e: `page.locator('[data-testid="filters-count"]')` contiene "2" |
| CA-06 | RF-06 | Un usuario con filtros | Pulsa "Limpiar" | Los filtros se resetean; el orden se mantiene | Test e2e: URL sin searchParams excepto `orden` |
| CA-07 | RF-07 | Un usuario con JS desactivado | Pulsa "Aplicar" | El form hace submit GET y el catálogo se filtra | Test e2e con `javaScriptEnabled: false` |
| CA-08 | RF-08 | Un usuario en escritorio | Carga /mujer | El panel está visible, no en un `<details>` cerrado | Test e2e: `[data-testid="filters-panel"]` no está dentro de `<details>` |
| CA-09 | RF-09 | Un usuario | Abre /mujer?talla=XXXL | La página carga sin ese filtro, sin alerta | Test e2e: no hay texto de alerta en la página |

## 12. Enmiendas

### Enmienda 1 — 2026-10-16 — ADR-006

**Origen:** al planificar T-008 se vio que `requestSubmit()` (ADR-005) recarga el documento
y que `loading.tsx` impide ver el catálogo sin JavaScript.

**Qué cambia:**

- Sección 6, fila Catálogo, columna Cargando: de «Skeleton con forma del grid» a «`aria-busy`
  y atenuación del panel mientras dura el filtrado; sin esqueleto de ruta».
- El mecanismo previsto en ADR-005 (`requestSubmit()`) pasa a navegación blanda (`router.push`),
  como exige CA-03 («sin recargar»). RF y CA no cambian.

### Enmienda 2 — 2026-10-16 — sin ADR

**Origen:** al cerrar T-009 quedaron dos puntos abiertos: RF-01 y RF-02 dejaban sin definir
el panel entre 768 y 1023 px, y el selector «Ordenar por» exigía «Aplicar filtros»
(RF-03 solo habla de chips). Se concretan sin cambiar el alcance. No se registra ADR:
no hay alternativas de coste alto de revertir.

**Qué cambia:**

- **RF-02:** el drawer se usa por debajo de `--bp-lg` (< 1024 px), no de `--bp-md`. Así
  tablet tiene siempre un panel de filtros (la columna lateral de RF-01 empieza en `--bp-lg`).
- **RF-03:** además de los chips, el selector «Ordenar por» se aplica al cambiar. Los campos de
  precio siguen requiriendo «Aplicar» (RF-04).
- Se añade el criterio CA-10. CA-02 se verifica a 375 px y, además, a 768 px.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-10 | RF-03 | Un usuario con JS activo | Cambia «Ordenar por» a «Precio: de menor a mayor» | El listado se reordena sin recargar y la URL lleva `orden=precio-asc` | Test e2e: `selectOption` + esperar URL y orden de precios; marca en `window` sigue presente |

**Nuevas tareas derivadas:** T-010 (Ordenar por al cambiar y drawer en tablet).

### Enmienda 3 — 2026-10-16 — ADR-006 (extensión)

**Origen:** al revisar T-009 se vio que el hash `#filtros-movil` (fallback sin JavaScript de RF-07) no
estaba documentado y que, con JavaScript, el CSS `:target` abre el drawer sin que React lo sepa.

**Qué cambia:**

- Se documenta el comportamiento del hash `#filtros-movil` como parte del fallback sin JavaScript de RF-07.
- Con JS: el drawer se abre al montar si el hash es `#filtros-movil`, y se cierra limpiando el hash.
- Sin JS: se mantiene el comportamiento actual de CSS `:target`.
- Nuevo CA-11 (el CA-10 ya lo usa la Enmienda 2 para «Ordenar por»).

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-11 | RF-07 | Un usuario con JS | Entra en `/mujer#filtros-movil` | El drawer está abierto, el foco está dentro, el fondo no scrollea y Esc lo cierra | Test e2e a 375 px: `goto('/mujer#filtros-movil')`, drawer visible, `activeElement` dentro, `body` con `overflow: hidden`, Esc cierra y el hash desaparece |

**Nuevas tareas derivadas:** T-011 (orden de botones del drawer y sincronización del hash), T-012
(indicador de carga al navegar al catálogo; sin CA todavía).

### Enmienda 4 — 2026-10-21 — sin ADR — barra de orden, filtros ocultables y panel con acordeones (CA-12 y CA-13)

**Origen:** el usuario pide que el catálogo siga la convención de las grandes tiendas (Zalando, ASOS, Zara, H&M): «Ordenar
por» arriba a la derecha del listado, un botón para ocultar los filtros y un panel con secciones plegables.

**Qué cambia:**
- **«Ordenar por» sale del panel de filtros** y va en una barra sobre el listado, a la derecha (RF-03 se mantiene: se
  aplica al cambiar). Como ya no está dentro del formulario de filtros, tiene su **propio formulario** `method="get"` con
  campos ocultos con los filtros vigentes; sin JavaScript lleva un botón «Ordenar» (en `<noscript>`).
- **«Ocultar filtros / Mostrar filtros»** (icono de ajustes de lucide, `aria-expanded` y `aria-controls`) en esa barra,
  **solo con JavaScript y desde `--bp-lg`**, donde existe la columna lateral. Oculta la columna y el listado pasa de 3 a 4
  columnas. **RF-08 se precisa:** el panel es visible por defecto y **sin JavaScript no se puede ocultar** (el botón no
  existe). El estado **no se guarda** entre visitas (sigue vigente «Guardar filtros entre sesiones» como fuera de alcance).
  En móvil y tablet (< `--bp-lg`) no cambia nada: botón «Filtros» y drawer.
- **Acordeones:** categoría, ocasión, talla y color son `<details>`/`<summary>` nativos, abiertos por defecto (funcionan
  sin JavaScript). El `<summary>` es de 44 px de alto y muestra cuántos filtros activos tiene esa sección.
- **Precio:** dos campos pequeños «Mín.» y «Máx.» en una fila, con un guion entre ellos y el símbolo «€»; siguen
  requiriendo «Aplicar» (RF-04).

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-12 | RF-03, RF-08 | El catálogo a 1280 px con JavaScript | Se mira la barra sobre el listado y se pulsa «Ocultar filtros» | «Ordenar por» está a la derecha de la barra y ya no está en el panel; cambiarlo reordena sin recargar y la URL lleva `orden`, conservando los filtros; «Ocultar filtros» (`aria-expanded="true"`) oculta la columna lateral y el listado pasa a 4 columnas sin scroll horizontal; «Mostrar filtros» la devuelve; el foco no se pierde. Con JavaScript desactivado el panel sigue visible, no hay botón de ocultar y «Ordenar» funciona con su botón. A 375 y 768 px no hay botón de ocultar y el drawer sigue igual | test e2e `catalog-toolbar` (Chromium) y unitario |
| CA-13 | RF-03, RF-04 | El panel de filtros | Se abre en escritorio y en el drawer | Categoría, ocasión, talla y color son acordeones nativos abiertos, plegables con teclado (Intro/Espacio) y de 44 px de alto; se pueden plegar sin perder el filtro marcado; el precio son dos campos «Mín.» y «Máx.» en una fila con guion y «€», con etiquetas accesibles, y se aplican con «Aplicar»; sin scroll horizontal de 320 a 1280 px; axe sin violaciones graves | test e2e `filters-accordion` (Chromium), test:a11y y unitario |

**Nuevas tareas derivadas:** T-073 (barra con orden y ocultar filtros) y T-074 (acordeones y precio Mín./Máx.).

### Enmienda 5 — 2026-10-21 — sin ADR — filtros en lista vertical en lugar de chips (CA-14)

**Origen:** el usuario ve mal los filtros como píldoras que se envuelven (chips) y pide una lista vertical con casillas, como
en las grandes tiendas (Zalando, ASOS, H&M). Decisión del usuario: **selección única** (sin cambiar datos ni URLs).

**Qué cambia:**
- **Categoría, ocasión, talla y género** (este solo en Novedades) dejan de ser chips y pasan a una **lista vertical** de
  opciones: una casilla cuadrada con marca de verificación y el nombre al lado (`text-sm`, color de acento al marcar). Siguen
  siendo **radios nativos** (se elige una sola opción, como dice «Fuera de alcance» sobre tallas múltiples), así que
  funcionan sin JavaScript y RF-03 no cambia: se aplican al elegir, sin «Aplicar».
- **Desaparece la opción «Todas».** Para quitar los filtros se usa «Limpiar», que mantiene el orden (RF-06) y **solo se
  muestra cuando hay algún filtro activo**. Quitar el filtro de una sola sección sin quitar los demás **no se ofrece** (queda
  como mejora posible).
- **Disposición:** categoría y ocasión en una columna; **talla en cuadrícula de dos columnas** (son muchas y cortas).
- **Color:** lista vertical con el **círculo de muestra** (mismos tokens `bg-swatch-<color>` de la ficha, ADR-007) y el nombre
  del color al lado. El círculo es decorativo; el nombre es el texto accesible, así que el color nunca es lo único.
- **Accesibilidad:** cada fila mide al menos 44 px de alto, tiene foco visible y la marca es un icono además del color
  (WCAG 1.4.1). Los acordeones (CA-13) y el precio no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-14 | RF-03, RF-06 | El panel de filtros en escritorio y en el drawer | Se abre y se elige una opción | Categoría, ocasión y talla son listas verticales (sin `flex-wrap`) de filas de ≥ 44 px con casilla y nombre; no existe «Todas»; la talla va en 2 columnas y el color con su círculo y el nombre al lado; elegir una opción aplica el filtro sin recargar y deja marcada solo esa; la marca es un icono; foco visible con teclado (flechas dentro del grupo); «Limpiar» solo aparece con filtros activos y los quita todos conservando el orden; sin JavaScript sigue funcionando con «Aplicar filtros»; sin scroll horizontal de 320 a 1280 px; axe sin violaciones graves | test e2e `filters-list` (Chromium), test:a11y y unitario |

**Nuevas tareas derivadas:** T-078 (filtros en lista vertical).

### Enmienda 6 — 2026-10-22 — sin ADR — precio con intervalo deslizante (CA-15)

**Origen:** el usuario pide que el precio sea un intervalo con dos tiradores, como en las grandes tiendas, y que los números
se actualicen en tiempo real mientras arrastra para ver dónde se detiene. Decisión del usuario: el listado se filtra **al
soltar**. **Sustituye a lo que CA-13 decía del precio** (dos campos sueltos) y retira «rango visual con deslizadores» de lo
que quedaba fuera de alcance.

**Qué cambia:**
- **Intervalo con dos tiradores** (dos `<input type="range">` nativos superpuestos, accesibles con teclado) con una barra que
  resalta el tramo elegido. Los límites salen del catálogo del ámbito (el precio más bajo y el más alto de las variantes, en
  euros enteros). Los campos «Mín.» y «Máx.» se mantienen encima y **se actualizan en tiempo real al arrastrar**; también se
  puede escribir en ellos (se aplica con Intro o al salir del campo).
- **Se filtra al soltar** el tirador (o poco después de la última flecha de teclado): navegación blanda, sin recargar. Con
  JavaScript el precio deja de necesitar «Aplicar» (RF-04 se precisa); el botón «Aplicar filtros» sigue ahí.
- Si un tirador queda en su límite, ese extremo **no se filtra** (la URL no lleva `min` o `max` y no cuenta como filtro activo).
  Los tiradores no se cruzan.
- **Sin JavaScript** se mantienen los dos campos numéricos con «Aplicar filtros» (el intervalo solo existe con JavaScript).
- **Accesibilidad:** cada tirador tiene nombre accesible («Precio mínimo» y «Precio máximo»), valor con «€», foco visible y
  zona táctil de 44 px; con `prefers-reduced-motion` no hay transiciones. Un único CSS nuevo en `globals.css` con tokens
  (los tiradores de `input[type=range]` no se pueden estilar solo con clases).

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-15 | RF-04 | El panel de filtros con JavaScript | Se arrastra un tirador del precio | Hay dos tiradores y una barra con el tramo elegido, con límites del catálogo; «Mín.» y «Máx.» cambian en tiempo real mientras se arrastra, sin tocar la URL; al soltar el listado se filtra sin recargar y la URL lleva `min`/`max`; un extremo en su límite no se filtra; los tiradores no se cruzan; con teclado (flechas, Inicio, Fin) también funciona; escribir en los campos y pulsar Intro mueve los tiradores y filtra; «Limpiar» y «Atrás» devuelven los tiradores y los números a la URL; tiradores de 44 px con foco visible y nombre accesible; sin scroll horizontal de 320 a 1280 px; sin JavaScript siguen los dos campos con «Aplicar filtros»; axe sin violaciones graves | test e2e `filters-price` (Chromium), test:a11y y unitarios |

**Nuevas tareas derivadas:** T-079 (intervalo de precio).
