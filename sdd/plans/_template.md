---
id: PLAN-XXX-<slug>
spec: SPEC-XXX-<slug>
rigor_level: S | M | L
style: v1-soft-commerce@0.3.0
palette:
  source: brand | assets | sector | asked
  mode: claro | oscuro
  seed: "#RRGGBB"
  approved_by: user | pending
  checked: "check-palette OK, YYYY-MM-DD"
deploy: vercel
status: borrador
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# PLAN-XXX — <título>

## 1. Resumen técnico

## 2. Arquitectura

## 3. Modelo de datos

## 4. Contratos

## 5. UI

## 5a. Dirección visual

<!-- Obligatorio. Sin esto, el proyecto sale sin imágenes o con
     imágenes genéricas, y se ve vacío. Rellena o marca DECISIÓN
     PENDIENTE si aún no lo sabes. -->

| Aspecto | Qué |
|---|---|
| Tipo de imágenes | Fotografía propia / Banco de imágenes / Ilustración / Generadas / Mixto |
| Origen | Cliente aporta / Compramos licencia / Gratis con atribución / Generamos con IA / Hacemos nosotros |
| Dónde van | Hero / Catálogo / Ficha de producto / Sección / Blog / Iconos |
| Estilo visual | (ej. "foto natural, luz suave", "producto sobre fondo neutro", "ambiente cálido") |
| Presupuesto de peso | Hero ≤ ___ KB, imágenes de catálogo ≤ ___ KB cada una |
| Formatos | AVIF/WebP con fallback JPG para imágenes grandes; SVG para iconos |
| Alt obligatorio | Sí / No (por defecto: sí, siempre) |
| Nombre de archivos | (ej. "producto-slug-01.avif", "hero-inicio.avif") |

### Verificación

- Todas las secciones del plan que mencionen "imagen" tienen su
  entrada aquí.
- Si el origen es "Cliente aporta", ¿ya los tienes? ¿Cuándo llegan?
- Si el origen es "Gratis con atribución", ¿la atribución está
  preparada?
- Si el origen es "Generamos con IA", ¿el prompt base está guardado?

## 5b. Decisiones de UI

<!-- Solo si alguna decisión de UI se aparta de la convención del sector.
     Si todo sigue la convención, escribir "Ninguna. Todas las decisiones
     siguen la convención del sector para este tipo de web." -->

| Decisión | Convención del sector | Por qué nos apartamos | Qué gana el usuario |
|---|---|---|---|
| ... | ... | ... | ... |

## 6. Estrategia de tests

| Capa | Herramienta | Qué cubre |
|---|---|---|
| ... | Vitest / Playwright / manual | ... |

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| ... | baja/media/alta | bajo/medio/alto | ... |

## 8. ADRs relacionados

## 9. Tareas derivadas

## 10. Notas técnicas

Patrones que se han aprendido y que conviene aplicar en este proyecto.
Cada uno se copia al plan solo si aplica.

### Fallback sin JavaScript con hash

Si una UI interactiva (overlay, drawer, panel) debe funcionar también
sin JavaScript:

- El disparador es un `<a href="#nombre-del-estado">` (no un `<button>`).
- El overlay se muestra por CSS `:target`.
- Con JS, un hook cliente (`useHashOverlay`) sincroniza el estado de
  React con el hash: al montar lee `location.hash`, al cerrar lo limpia.
- El hook se reutiliza en todos los overlays del proyecto (menú, drawer
  de filtros, modal). No se duplica.

Motivo: `<button>` sin JS no abre nada. `<a href="#x">` funciona sin
JS y con JS.

### `loading.tsx` incompatible con no-JS

Si el proyecto exige funcionar sin JavaScript (algunos CAs lo piden),
`loading.tsx` de Next.js rompe: el usuario sin JS se queda en el
esqueleto de carga para siempre, porque el HTML real espera un script
para sustituirlo.

Solución: quitar `loading.tsx` y cubrir el feedback de carga con
Suspense manual (solo activo con JS) o con una barra de progreso
sutil. Nunca reintroducir `loading.tsx` si hay CAs de no-JS.

### `priority` de Next 16.4 obsoleto en `<Image>`

En Next 16.4 el prop `priority` del componente `<Image>` está
deprecado: solo quita el `loading="lazy"` pero no pone
`fetchpriority="high"`.

Solución: si hay que marcar una imagen como LCP, no usar el wrapper.
Aplicar directamente al `<img>` subyacente:

    <img fetchPriority="high" loading="eager" ... />

Y verificar en el HTML generado que los atributos están presentes.
Solo la primera imagen del listado (el LCP real), no todas las
visibles.

### Otros patrones

<!-- Aquí se van añadiendo conforme aparecen. Los patrones van al OS
     (a esta plantilla) para que todos los proyectos los hereden. -->
