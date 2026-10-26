---
description: Pase de pulido visual antes de cerrar un milestone. Guía por una checklist mirando la web en el navegador, no los tests.
---

Vas a guiar al usuario por un pase de pulido visual. Diferente del
/check (puertas técnicas): aquí se mira la web con los ojos.

## Cuándo se usa

Antes de cerrar un milestone: MVP terminado, demo al cliente, release.
NO se usa al cerrar cada tarea.

## Antes de empezar

1. Comprueba que compila y pasa tests:
   pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e

2. Arranca el servidor:
   pnpm dev

3. Abre el navegador en http://localhost:3000.

4. Recuerda al usuario que el navegador debe estar visible. Vamos a
   mirar la web, no el código.

## Checklist

Recorre punto por punto. En cada uno, pide al usuario que mire y
responda. Si algo se ve mal, se anota.

### 1. Chevrón y controles de formulario

- Los `<select>` muestran chevron custom (lucide), no el nativo.
  Alineado con el padding, no sobresalido.
- Checkboxes y radios personalizados coinciden con el estilo.
- Botones con altura consistente entre sí.

### 2. Espaciado y alineación

- Elementos de una fila alineados verticalmente.
- Espaciados coherentes entre secciones.
- Iconos centrados en sus contenedores.
- Ningún elemento pegado a otro sin margen.

### 3. Tipografía

- Pesos del estilo (nada de improvisos).
- Tamaños coherentes (escala del estilo).
- Titulares sin malos saltos de línea.
- Contraste del texto secundario correcto.

### 4. Responsive

- 320 px: nada se sale.
- 375 px: igual.
- 768 px: transiciones sin rarezas.
- 1280 px: equilibrado.
- ¿Los filtros en móvil se ven como un menú limpio (select/dropdown) o
  hay una fila de botones desbordada?

### 5. Estados y vacíos

- Lista vacía: mensaje claro con acción.
- Cargando: feedback visible.
- Error: mensaje útil.
- Formularios: errores junto al campo.

### 6. Interacciones

- Hover visible en clicables.
- Focus con teclado visible y orden lógico.
- Overlays cierran con Esc.
- Ningún enlace a `#` vacío.

### 7. Contenido

- Textos reales (no lorem ipsum).
- Imágenes cargan con alt.
- Precios, fechas, contactos correctos.
- Aviso legal / demo visible si aplica.

### 8. Dirección visual

- Imágenes aportan, no genéricas.
- Hero transmite lo que debe.
- Ninguna sección vacía de contenido visual.
- Solo si el proyecto es e-commerce (catálogo o carrito):
  - ¿El Hero es una imagen a sangre o una tarjeta grande, con texto
    legible (scrim si hay imagen de fondo)?
  - ¿Hay al menos una franja de interrupción (promoción) entre las
    rejillas de productos?
  - ¿Con más de 3 categorías, se muestran como carrusel o rejilla de
    imágenes y no solo texto?

### 9. Layout Macro y Navegación

- ¿Los headers y footers están alineados en grid?
- ¿Hay columnas vacías o desequilibradas (ej. media pantalla negra)?
- ¿Los headers se quedan fijos al hacer scroll (sticky)?
- ¿El menú móvil se ve limpio y sin numeraciones raras?
- ¿Los enlaces del footer no tienen subrayados feos?

## Cierre

Guarda el resultado en `sdd/reviews/revisar-<fecha>.md` con este
formato:

    # Pase de pulido visual — <fecha>

    ## Milestone revisado
    <MVP / release / demo / …>

    ## Hallazgos

    | # | Sev. | Sección | Hallazgo | Corrección |
    |---|---|---|---|---|
    | 1 | Alta | Select "Ordenar por" | Chevron nativo desalineado | Chevron lucide custom |
    | 2 | Media | … | … | … |

    ## Verificados OK
    Lista de puntos que se ven bien.

    ## Tareas derivadas
    - T-xxx (si alguna)

**Bloqueante:** los hallazgos Altos impiden cerrar el milestone. Los
Medios y Bajos se pueden anotar como tareas pendientes.

## Reglas

- No arregles nada durante el pase. Solo observa y anota.
- Los hallazgos Altos van a tareas inmediatas.
- Si el usuario no puede mirar la web en ese momento, detente.
