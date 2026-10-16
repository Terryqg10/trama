---
id: PLAN-001-trama-tienda
spec: SPEC-001-trama-tienda
rigor_level: L
style: v1-soft-commerce@0.3.0
palette:
  source: sector
  mode: claro
  seed: "#1f4e5f"
  approved_by: user
  checked: "check-palette OK, 2026-10-12"
deploy: vercel
status: aprobada
created: 2026-10-12
updated: 2026-10-12
---

# PLAN-001 — Trama: tienda e-commerce de ropa

## 1. Resumen técnico

Next.js (App Router) + TypeScript estricto, Tailwind 4 con tokens de
`v1-soft-commerce` y `palette.css`. Supabase (Auth, Postgres con RLS,
Storage). Stripe en modo test. Despliegue en Vercel. Gestor: pnpm.
Importes en céntimos.

Nota: el estilo `v1-soft-commerce` está en `borrador 0.3.0`. VERIFICAR si hay que
aprobarlo antes de la primera UI.

## 2. Arquitectura

```
src/
  app/                  rutas (catálogo, producto, carrito, checkout, cuenta, admin, legal)
    api/stripe/webhook/ webhook con cuerpo crudo y firma verificada
  components/           UI (solo tokens)
  lib/
    env.ts              validación Zod de variables de entorno
    supabase/           clientes servidor/navegador (única vía a Supabase)
    stripe/             cliente y helpers (única vía a Stripe)
    schemas/            esquemas Zod (z.infer para los tipos)
    domain/             lógica pura: carrito, importes, transiciones de pedido
supabase/migrations/    SQL versionado (tablas + RLS)
```

- Autorización en dos capas: comprobación en servidor + RLS en BD.
- Lógica de negocio pura en `lib/domain/`, testeable sin red.
- Los importes se calculan siempre en el servidor desde la BD.

## 3. Modelo de datos

| Tabla | Campos clave | RLS (resumen) |
|---|---|---|
| `profiles` | `id` (= auth.uid), `full_name`, `role` (`customer`/`admin`) | Lectura/edición propia. `role` no editable por el cliente. |
| `addresses` | `id`, `user_id`, campos de dirección | CRUD solo del propietario. |
| `products` | `id`, `slug`, `name`, `description`, `gender`, `category`, `active` | Select público de activos. Escritura solo admin. |
| `product_variants` | `id`, `product_id`, `size`, `color`, `price_cents`, `stock` | Select público. Escritura solo admin. |
| `carts` / `cart_items` | `user_id`, `variant_id`, `qty` | Solo del propietario. |
| `orders` | `id`, `user_id`, `status`, `total_cents`, `shipping_cents`, `stripe_session_id` | Select del propietario y admin. Update solo admin y servicio. |
| `order_items` | `order_id`, `variant_id`, `qty`, `unit_price_cents` (instantánea) | Hereda del pedido. |
| `stock_reservations` | `order_id`, `variant_id`, `qty`, `expires_at`, `status` | Solo servicio y admin. |
| `stripe_events` | `event_id` (PK), `received_at` | Solo servicio. Garantiza idempotencia. |

Tipos TypeScript generados con `pnpm db:types`. No se escriben a mano.

## 4. Contratos

- `POST /api/checkout` → entrada Zod `{ addressId, items:[{variantId, qty}] }`. Salida: URL/secreto de pago. El servidor ignora cualquier precio recibido.
- `POST /api/stripe/webhook` → verifica firma, inserta `event_id` (si ya existe, 200 sin efectos), actualiza pedido.
- Acciones de servidor del admin validadas con Zod y comprobación de rol.
- Respuestas de error con forma uniforme `{ error: { code, message } }`.

## 5. UI

- Estilo `v1-soft-commerce`, contenido centrado, modo claro.
- Tokens exclusivamente. Prohibidos hex, rgb() y valores arbitrarios.
- Logo SVG "Trama" con `currentColor`, enlazado a `/`.
- Iconos con lucide-react, tipografía Geist, animación con Motion respetando `prefers-reduced-motion`.
- Navegación definida: Inicio, Hombre, Mujer, Carrito, Cuenta; Admin solo para rol admin.

## 6. Estrategia de tests

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Unitarios | Vitest | Dominio (carrito, importes, transiciones), esquemas Zod, validación de env |
| Componentes | Vitest + Testing Library | Selector de variantes, carrito, formularios |
| Integración con BD real | Vitest + Supabase local | RLS y aislamiento entre usuarios, reservas atómicas, webhook idempotente, checkout |
| E2E | Playwright | Registro/login, filtrado, compra completa con tarjeta de test, admin crea producto, logo a `/` |
| Accesibilidad | axe (Playwright) | Páginas principales |
| Rendimiento | Lighthouse | Home y detalle (VERIFICAR umbral) |
| Seguridad | gitleaks, `pnpm audit` | Secretos y dependencias |
| CI | GitHub Actions bloqueante | tsc, lint, build, tests, audit, check-palette |

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Fallo de RLS que expone datos | media | alto | Políticas explícitas por tabla y pruebas de aislamiento antes de consumir datos |
| Sobreventa del último artículo | media | medio | Reserva atómica en BD (CA-18) |
| Webhooks duplicados | alta | medio | Tabla `stripe_events` e idempotencia (CA-13) |
| Clave live de Stripe por error | baja | alto | Validación Zod que rechaza claves no `test` (CA-24) |
| Alcance muy grande para un solo ciclo | alta | medio | Tareas atómicas, una por sesión, en orden de dependencia |
| Estilo v1 aún en borrador | media | bajo | VERIFICAR aprobación y registrar ADR si cambia |
| Límites del plan gratuito de Supabase | media | bajo | Revisar cuotas y configurar alertas (VERIFICAR) |

## 8. ADRs relacionados

Pendientes de crear con `/decide`:
- ADR-001 Supabase como backend (Auth + Postgres + Storage).
- ADR-002 Stripe: Checkout alojado vs Payment Element (VERIFICAR).
- ADR-005 Historial de precios y cálculo del precio más bajo de 30 días (previo a T-003c).
- ADR-006 Reserva de stock con caducidad en BD.

Registrados: ADR-001 (braces), ADR-002 (Supabase en la nube), ADR-003 (Enmienda 1 a la spec),
ADR-004 (roles y ajustes desde el panel admin). Nota: ADR-003 menciona "ADR-004" para el
historial de precios; al no editarse un ADR aceptado, esa referencia pasa a ser ADR-005.

## 9. Tareas derivadas

| Tarea | Resumen | CA |
|---|---|---|
| T-001 | Scaffolding, configuración estricta y validación de entorno | CA-24, CA-25 |
| T-002 | CI bloqueante (GitHub Actions) | CA-25 |
| T-003 | Identidad y pedidos con RLS y prueba de aislamiento (ADR-002) | CA-14 |
| T-003b | Catálogo y carrito con RLS (incluye campos de ocasión, ajuste y guía de tallas, Enmienda 1) | CA-15 |
| T-003c | Precio de referencia e historial de precios (previo ADR-004 y verificación legal) | CA-30 |
| T-004 | Logo, layout base, navegación y bloque de envío y devolución | CA-20, CA-23, CA-29 |
| T-004b | Páginas legales de ejemplo y enlaces en el pie | CA-34 |
| T-005a | Datos del catálogo: `product_images`, seed con placeholders y capa de consultas (sin UI) | CA-01 (consulta) |
| T-005 | Listado con filtros de talla, color, precio y Ocasión, orden, Novedades y Ofertas (vacía hasta T-003c) | CA-01, CA-02, CA-26, CA-27, CA-32 |
| T-005c | Filtros del listado en columna lateral izquierda en escritorio | CA-45 |
| T-005b | Ficha de producto, guía de tallas y datos de ajuste | CA-03, CA-31, CA-33 |
| T-006 | Auth y perfil | CA-06 a CA-08 |
| T-007 | Carrito con umbral de envío gratis (50 €) | CA-04, CA-05, CA-28 |
| T-008 | Checkout, reserva y webhook | CA-09 a CA-13, CA-18, CA-19 |
| T-009 | Historial de pedidos | CA-14 |
| T-003d | Esquema de `shop_settings` y `role_audit_log` con RLS (ADR-004) | CA-36, CA-39 |
| T-010a | Panel admin: productos, variantes, imágenes y stock | CA-15, CA-16 |
| T-010b | Panel admin: pedidos y transiciones de estado | CA-17 |
| T-010c | Panel admin: guías de tallas y ajustes de envío | CA-35, CA-37, CA-38 |
| T-010d | Panel admin: usuarios y roles, con auditoría | CA-40 a CA-43 |
| T-010e | Panel admin: precio de referencia (tras T-003c y verificación legal) | CA-44 |
| T-011 | Accesibilidad, movimiento y rendimiento | CA-21, CA-22 |

Las tareas T-002 en adelante se crean con `/new-task` cuando toque.
