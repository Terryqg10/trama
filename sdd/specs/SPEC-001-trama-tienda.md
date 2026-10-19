---
id: SPEC-001-trama-tienda
title: Trama — tienda e-commerce de ropa casual y de vestir
status: aprobada
rigor_level: L
created: 2026-10-12
updated: 2026-10-15
---

# SPEC-001 — Trama: tienda e-commerce de ropa

## 1. Objetivos

- Construir **Trama**, una tienda online de ropa casual y de vestir para
  hombre y mujer (polos, camisas, blusas, pantalones) para España, en EUR
  y solo en es-ES.
- Proyecto personal de portfolio hecho a fondo: flujo completo de compra,
  cuentas de usuario, pagos en **modo test** y panel de administración.
- Demostrar rigor: RLS con prueba de aislamiento, validación con Zod,
  accesibilidad AA, tests de integración con BD real y CI bloqueante.

## 2. Fuera de alcance

1. Cobro real. Solo Stripe en modo test. La arquitectura queda preparada
   para activarlo con ADR + enmienda.
2. Multi-idioma y multi-moneda.
3. Devoluciones y reembolsos gestionados en la app (solo texto informativo).
4. Envío por transportista: tarifa plana fija, sin integración.
5. Email transaccional propio (se usan los emails de Supabase Auth).
6. Reseñas, wishlist, cupones y recomendaciones.

## 3. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | Listado de catálogo con filtros por género (hombre/mujer) y categoría (polos, camisas, blusas, pantalones). |
| RF-02 | Detalle de producto: fotos, descripción, precio con IVA incluido, selección de talla y color, indicación de stock. |
| RF-03 | Carrito: añadir, cambiar cantidad, quitar. Persiste en el navegador para invitados y se fusiona con el de la cuenta al iniciar sesión. |
| RF-04 | Registro, inicio de sesión, cierre de sesión y recuperación de contraseña con Supabase Auth. |
| RF-05 | Perfil del cliente: nombre y direcciones de envío (alta, edición, borrado). |
| RF-06 | Checkout: elegir dirección, ver resumen (subtotal, envío tarifa plana, total) y pagar con Stripe en modo test. Requiere sesión. |
| RF-07 | Confirmación del pedido mediante webhook de Stripe con firma verificada. Procesamiento idempotente. El pedido pasa a `pagado`. |
| RF-08 | Historial de pedidos del cliente con detalle y estado. |
| RF-09 | Admin: alta, edición y baja de productos, variantes (talla/color), imágenes y stock. |
| RF-10 | Admin: listado de pedidos y cambio de estado según la máquina de estados (sección 7). |
| RF-11 | Reserva de stock al iniciar el pago, con caducidad. Si el pago no se completa, el stock se libera. |
| RF-12 | Identidad: logo SVG minimalista "Trama" que enlaza a `/`; páginas legales de ejemplo (aviso legal, privacidad, cookies, condiciones) marcadas como contenido ficticio. |

## 4. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | `tsc --noEmit`, lint y `pnpm build` sin errores. TypeScript estricto, sin `any` ni `@ts-ignore`. |
| RNF-02 | Accesibilidad WCAG AA: axe sin violaciones graves, foco visible, objetivos táctiles ≥ 44×44 px, texto ≥ 12 px. |
| RNF-03 | `prefers-reduced-motion` respetado con alternativa estática. Sin scroll-jacking. |
| RNF-04 | Estilo `v1-soft-commerce` y `palette.css`. Los componentes usan solo tokens. |
| RNF-05 | Rendimiento: Lighthouse ≥ 90 en rendimiento y accesibilidad en home y detalle (VERIFICAR umbral realista con imágenes reales). |
| RNF-06 | Scripts cross-platform (Node/TS). Sin sh/bash. |
| RNF-07 | Todo input externo validado con Zod. Tipos derivados con `z.infer`. Tipos de BD generados, no escritos a mano. |
| RNF-08 | Importes en céntimos (enteros). Nunca `float` para dinero. |

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Stock insuficiente al pagar | Se bloquea el checkout, se indica la variante afectada y se ofrece ajustar la cantidad. |
| Dos clientes compran la última unidad | Solo el primero obtiene la reserva (operación atómica en BD). El segundo ve el aviso. |
| Webhook duplicado o fuera de orden | Idempotente por `event.id`. No duplica pedido ni stock. |
| Webhook con firma inválida | `400`, sin efectos, registro del intento. |
| Pago abandonado | La reserva caduca y el stock se libera. El pedido queda `cancelado`. |
| Carrito de invitado y cuenta con carrito | Se fusionan sumando cantidades, con tope por el stock. |
| Producto retirado con unidades en un carrito | Se avisa en el carrito y se excluye del checkout. |
| Sesión caducada durante el checkout | Redirige al login y conserva el carrito. |
| Timeout de Stripe o Supabase | Error recuperable con reintento manual. Sin reintentos automáticos sin tope. |
| Usuario intenta ver pedido ajeno | `404`. RLS lo impide además de la capa de aplicación. |
| Usuario no admin accede al panel | `403`/redirección. RLS impide las escrituras aunque se salte la UI. |

## 6. Estados de error y vacío en la UI

| Pantalla / flujo | Vacío | Cargando | Error |
|---|---|---|---|
| Catálogo | "No hay productos con estos filtros" + limpiar filtros | Esqueleto de tarjetas | Mensaje y botón reintentar |
| Detalle de producto | 404 con enlace al catálogo | Esqueleto | Mensaje y botón reintentar |
| Carrito | "Tu carrito está vacío" + ir al catálogo | Indicador en totales | Aviso por línea afectada |
| Checkout | Redirige al carrito si está vacío | Botón de pago con estado ocupado | Mensaje del fallo de pago, sin perder datos |
| Historial de pedidos | "Aún no has hecho pedidos" | Esqueleto | Mensaje y reintentar |
| Perfil / direcciones | "Sin direcciones guardadas" | Esqueleto | Errores por campo (Zod) |
| Admin: productos | "Sin productos" + crear | Esqueleto | Mensaje y reintentar |
| Admin: pedidos | "Sin pedidos" | Esqueleto | Mensaje y reintentar |

## 7. Máquina de estados

Pedido:

```
pendiente --pago confirmado--> pagado --admin--> preparado --admin--> enviado --admin--> entregado
pendiente --caduca/abandona--> cancelado
pagado --admin--> cancelado
```

| Desde | Hacia | Quién / evento |
|---|---|---|
| pendiente | pagado | Webhook de Stripe verificado |
| pendiente | cancelado | Caducidad de la reserva o cancelación del cliente |
| pagado | preparado | Admin |
| pagado | cancelado | Admin (sin reembolso en la app; queda como nota) |
| preparado | enviado | Admin |
| enviado | entregado | Admin |

Cualquier otra transición se rechaza. `entregado` y `cancelado` son finales.

Reserva de stock: `activa` → `consumida` (pedido pagado) o `liberada` (caducidad o
cancelación).

## 8. Riesgos de seguridad

| Riesgo | Mitigación |
|---|---|
| Acceso a datos de otros usuarios | RLS en todas las tablas con políticas explícitas de select/insert/update/delete y prueba de aislamiento (I3). |
| Escalada a admin | Rol en tabla propia, no editable por el cliente. Políticas RLS por rol. |
| Webhook falsificado | Verificación de firma con el secreto del webhook. Cuerpo crudo. Idempotencia. |
| Manipulación de precios desde el cliente | El servidor calcula importes desde la BD. El cliente solo envía ids y cantidades. |
| Fuga de claves | `service_role` y claves secretas de Stripe solo en servidor. Nada en `NEXT_PUBLIC_*` salvo la clave pública de Stripe y la URL/anon key de Supabase. gitleaks en pre-commit y CI. |
| Inyección y XSS | Zod en el límite, consultas parametrizadas, escape por defecto de React. |
| Fuerza bruta en login | Límites de Supabase Auth. VERIFICAR configuración y añadir rate limit propio en endpoints públicos. |
| Carga de imágenes maliciosas (admin) | Validar tipo y tamaño. Bucket con políticas. |
| Dependencias vulnerables | `pnpm audit --audit-level=high` y Renovate/Dependabot. |

## 9. Datos y privacidad

| Dato | Para qué | Dónde | Cuánto tiempo | Cómo se borra |
|---|---|---|---|---|
| Email y contraseña (hash) | Cuenta e inicio de sesión | Supabase Auth | Mientras exista la cuenta | Baja de cuenta |
| Nombre | Perfil y pedidos | Supabase (Postgres) | Mientras exista la cuenta | Baja de cuenta |
| Direcciones de envío | Entrega | Supabase (Postgres) | Mientras exista la cuenta | Borrado desde el perfil o baja de cuenta |
| Pedidos (líneas, importes, estado) | Historial | Supabase (Postgres) | Mientras exista la cuenta | Anonimización en baja de cuenta (VERIFICAR obligación de conservación fiscal; en portfolio no aplica) |
| Datos de tarjeta | Pago | **Solo Stripe**; la app nunca los ve ni los guarda | Stripe | Stripe (modo test) |

- Tratamiento conforme a RGPD (VERIFICAR requisitos con un asesor antes de uso real).
- Las páginas legales son ficticias y no tienen valor jurídico.
- Cookies: solo las técnicas necesarias (sesión). Sin analítica ni publicidad.

## 10. APIs externas

| API | Uso | Términos | Tope de coste |
|---|---|---|---|
| Supabase | Auth, Postgres con RLS, Storage de imágenes | VERIFICAR términos y límites del plan gratuito | Plan gratuito. Alerta de uso configurada en el proveedor. VERIFICAR cuota. |
| Stripe (modo test) | Pagos de prueba, webhooks | VERIFICAR términos y condiciones del modo test | Sin coste en test. Claves `sk_test_`/`pk_test_` únicamente. Cualquier clave live se rechaza al arrancar (validación Zod). |

Toda llamada pasa por `src/lib/supabase/` y `src/lib/stripe/`. Nunca `fetch`
directo desde un componente. Al fallar o superar un tope: falla cerrado con
mensaje claro, no silencioso. Sin reintentos sin tope.

## 11. Criterios de aceptación

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-01 | RF-01 | Catálogo con productos de ambos géneros | Filtro por "mujer" + "blusas" | Solo se listan blusas de mujer | test e2e `catalog-filter` |
| CA-02 | RF-01 | Filtros sin resultados | Se aplican | Se muestra el estado vacío con "limpiar filtros" | test e2e `catalog-empty` |
| CA-03 | RF-02 | Producto con variantes | Se elige talla sin stock | La talla se muestra deshabilitada y no se puede añadir | test componente `variant-stock` |
| CA-04 | RF-03 | Invitado con 2 líneas en el carrito | Inicia sesión | El carrito se fusiona con el de la cuenta sin perder líneas | test integración `cart-merge` |
| CA-05 | RF-03 | Línea con cantidad > stock | Se intenta aumentar | Se limita al stock y se avisa | test unitario `cart-qty-cap` |
| CA-06 | RF-04 | Email válido y contraseña válida | Se registra | Se crea la cuenta y se puede iniciar sesión | test e2e `auth-register-login` |
| CA-07 | RF-04 | Credenciales erróneas | Se intenta entrar | Error genérico sin revelar si el email existe | test e2e `auth-bad-credentials` |
| CA-08 | RF-05 | Cliente con dirección | Edita con campos inválidos | Errores por campo y no se guarda | test unitario `address-schema` |
| CA-09 | RF-06 | Carrito con stock | Paga con tarjeta de test válida | Se crea la sesión de pago con importes calculados por el servidor | test integración `checkout-amounts` |
| CA-10 | RF-06 | Cliente manipula el precio en la petición | Envía el checkout | El servidor ignora el precio del cliente y usa el de la BD | test integración `checkout-price-tamper` |
| CA-11 | RF-07 | Webhook con firma válida | Llega `payment_succeeded` | El pedido pasa a `pagado` y se consume la reserva | test integración `webhook-paid` |
| CA-12 | RF-07 | Webhook con firma inválida | Llega a la ruta | Responde 400 y no hay cambios en BD | test integración `webhook-bad-signature` |
| CA-13 | RF-07 | Mismo evento recibido dos veces | Se procesa dos veces | Un solo pedido pagado y stock descontado una vez | test integración `webhook-idempotent` |
| CA-14 | RF-08 | Cliente A y cliente B con pedidos | A consulta pedidos | A solo ve los suyos. B nunca aparece | test RLS `orders-isolation` |
| CA-15 | RF-09 | Usuario no admin | Intenta crear un producto vía API | Rechazo por RLS | test RLS `products-write-nonadmin` |
| CA-16 | RF-09 | Admin | Crea producto con variantes | Aparece en el catálogo | test e2e `admin-create-product` |
| CA-17 | RF-10 | Pedido `entregado` | Admin intenta pasarlo a `pagado` | Transición rechazada | test unitario `order-transitions` |
| CA-18 | RF-11 | Última unidad y dos compradores | Ambos inician el pago a la vez | Solo uno obtiene la reserva | test integración `reserve-last-unit` |
| CA-19 | RF-11 | Reserva caducada | Pasa el tiempo límite | El stock se libera y el pedido queda `cancelado` | test integración `reserve-expiry` |
| CA-20 | RF-12 | Cualquier página | Se hace clic en el logo | Navega a `/` | test e2e `logo-home` |
| CA-21 | RNF-02 | Páginas principales | Se ejecuta axe | Sin violaciones graves | `pnpm test:a11y` |
| CA-22 | RNF-03 | `prefers-reduced-motion: reduce` | Se carga la UI | Sin animaciones, con alternativa estática | test e2e `reduced-motion` |
| CA-23 | RNF-04 | Código de componentes | Se corre `check-palette` y búsqueda de hex | Pasa y no hay hex ni rgb() en componentes | `pnpm check-palette` + revisión |
| CA-24 | RNF-07 | Variables de entorno | Se arranca con una clave Stripe live | La validación Zod rechaza el arranque | test unitario `env-schema` |
| CA-25 | RNF-01 | Repo recién clonado | Se ejecutan tsc, lint y build | Los tres terminan sin errores | `pnpm typecheck && pnpm lint && pnpm build` |

## 12. Enmiendas

### Enmienda 1 — 2026-10-15 — ADR-003

**Origen:** estudio de competencia (`research/competitor-insights.md`).

**Qué cambia:**
- Sección 2 (Fuera de alcance), punto 4: la "tarifa plana fija" deja de ser
  el único modelo de envío. Se mantiene la tarifa plana por debajo de 50 € y el
  envío es **gratis desde 50 €** (umbral en céntimos: 5000, constante de
  configuración en servidor; hacerlo editable desde el admin queda diferido).
- RF-06 **no cambia**: el checkout sigue exigiendo sesión (compra como invitado
  descartada).
- Sin newsletter ni datos personales nuevos: la sección 9 no cambia.

**Nuevos requisitos funcionales:**

| ID | Requisito |
|---|---|
| RF-13 | Navegación con secciones **Novedades** y **Ofertas** de primer nivel. |
| RF-14 | Filtros de listado por **talla, color y precio**, y ordenación (novedades, precio ascendente y descendente). |
| RF-15 | **Envío gratis** cuando el total del carrito alcanza 50 €. Por debajo se aplica la tarifa plana. |
| RF-16 | **Bloque visible de envío y devolución** en home, ficha y carrito, con las condiciones completas y sin asteriscos ocultos. |
| RF-17 | **Precio de referencia** opcional por variante, mostrado tachado con el porcentaje de descuento y con el **precio más bajo de los últimos 30 días** (obligatorio cuando hay descuento). VERIFICAR normativa aplicable antes de cerrar CA-30. |
| RF-18 | **Guía de tallas** por categoría, accesible desde la ficha. |
| RF-19 | Faceta **Ocasión** (casual / vestir) en filtros y navegación. |
| RF-20 | **Datos de ajuste** en la ficha: altura y talla del modelo, composición y cuidados. |

**Nuevos criterios de aceptación:**

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-26 | RF-13 | Productos marcados como nuevos y otros no | Se abre Novedades | Solo aparecen los nuevos | test e2e `catalog-new-in` |
| CA-27 | RF-14 | Productos con varias tallas | Se filtra por talla M | Solo se listan los que tienen M con stock | test e2e `catalog-filter-size` |
| CA-28 | RF-15 | Carrito con total ≥ 50 € | Se calcula el total | El envío es 0 € | test unitario `shipping-free-threshold` |
| CA-29 | RF-16 | Home, ficha y carrito | Se cargan | Muestran las condiciones de envío y devolución sin asteriscos | test e2e `shipping-policy-visible` |
| CA-30 | RF-17 | Producto con precio de referencia | Se muestra | Aparece tachado con % y con el precio más bajo de los últimos 30 días | test integración `reference-price-lowest-30d` (**bloqueado hasta VERIFICAR normativa**) |
| CA-31 | RF-18 | Ficha de una camisa | Se abre la guía de tallas | Muestra la tabla de esa categoría | test e2e `size-guide` |
| CA-32 | RF-19 | Producto de vestir | Se filtra Ocasión = vestir | Aparece en el listado | test e2e `catalog-filter-occasion` |
| CA-33 | RF-20 | Producto con altura y talla del modelo | Se abre la ficha | Se muestran junto a composición y cuidados | test componente `fit-info` |

**Nuevas tareas derivadas:** T-003b (ajustada), T-003c (precios de referencia e
historial, previo ADR-004), T-004 (bloque de envío), T-005 (filtros), T-005b
(ficha con guía de tallas y datos de ajuste) y T-007 (umbral de envío gratis).

### Enmienda 2 — 2026-10-15 — sin ADR

**Origen:** RF-12 pide páginas legales de ejemplo pero no tenía ningún CA que
las cubriera (solo CA-20, el logo). Se concreta sin cambiar el alcance. No se
registra ADR porque no hay alternativas de coste alto de revertir.

**Qué cambia:** se añade un criterio de aceptación. RF-12 no cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-34 | RF-12 | El pie de cualquier página | Se abre cada enlace legal (aviso legal, privacidad, cookies, condiciones) | La página responde 200, indica de forma visible que es contenido ficticio sin valor jurídico y enlaza de vuelta a `/` | test e2e `legal-pages` |

**Nuevas tareas derivadas:** T-004b (páginas legales y enlaces en el pie).

### Enmienda 3 — 2026-10-15 — ADR-004

**Origen:** se pide un panel de administración más amplio que el previsto
(RF-09 y RF-10 solo cubrían catálogo y pedidos).

**Qué cambia:**
- **RF-09 se aclara:** el formulario de producto incluye también ocasión, "nuevo",
  composición, cuidados y datos del modelo (RF-19 y RF-20).
- **RF-15:** la tarifa plana y el umbral de 50 € dejan de ser constantes fijas.
  Pasan a ser **valores por defecto** de unos ajustes editables (RF-22).
- **Sección 8 (riesgos de seguridad):** se añade la escalada a admin desde el
  panel. Mitigación: el cambio de rol solo ocurre por acción de servidor con
  `service_role`, comprobando `is_admin()`, con auditoría y sin dejar el
  sistema sin admin. `profiles.role` sigue sin ser editable por RLS.
- **Sección 9 (datos y privacidad):** el rol admin ve email, nombre, rol y fecha
  de alta de los clientes, y sus pedidos, solo para gestionar la tienda. No ve
  contraseñas ni datos de tarjeta. Cada cambio de rol queda registrado
  (quién, a quién, cuándo, rol anterior y nuevo). La política de privacidad
  publicada debe actualizarse cuando se active el panel.
- **Primer admin:** se crea manualmente por SQL. No hay endpoint para ello.

**Nuevos requisitos funcionales:**

| ID | Requisito |
|---|---|
| RF-21 | El admin edita las **guías de tallas** por categoría. |
| RF-22 | El admin edita la **tarifa plana** y el **umbral de envío gratis** (céntimos enteros, validados). El servidor lee estos ajustes de BD, con los de RF-15 como valores por defecto. |
| RF-23 | El admin **lista clientes** (email, nombre, rol, fecha de alta) y **cambia su rol** entre cliente y admin. Cada cambio se registra en una auditoría. Un admin no puede quitarse el rol a sí mismo ni dejar el sistema sin administradores. |
| RF-24 | El admin edita el **precio de referencia** de una variante desde el formulario de producto. Sujeto a RF-17, a T-003c y a la verificación de la normativa. |

**Nuevos criterios de aceptación:**

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-35 | RF-21 | Un admin | Edita la guía de tallas de camisas | La ficha pública de una camisa muestra la tabla actualizada | test e2e `admin-size-guide` |
| CA-36 | RF-21 | Un usuario no admin | Intenta escribir en las guías de tallas | Rechazo por RLS | test RLS `size-guides-write-nonadmin` |
| CA-37 | RF-22 | Un admin que sube el umbral a 60 € | Se calcula un carrito de 55 € | El envío es la tarifa plana, no 0 € | test integración `shipping-settings-threshold` |
| CA-38 | RF-22 | Un admin | Guarda un importe negativo o con decimales | Se rechaza con error por campo | test unitario `shipping-settings-schema` |
| CA-39 | RF-22 | Un usuario no admin | Intenta cambiar los ajustes de envío | Rechazo por RLS | test RLS `shop-settings-write-nonadmin` |
| CA-40 | RF-23 | Un admin | Abre la lista de clientes | Ve email, nombre, rol y fecha de alta, y no contraseñas ni datos de tarjeta | test e2e `admin-users-list` |
| CA-41 | RF-23 | Un admin | Promueve a un cliente | El rol pasa a admin y queda una fila de auditoría con actor, objetivo, rol anterior y nuevo | test integración `role-change-audit` |
| CA-42 | RF-23 | Un cliente no admin | Intenta cambiar un rol por la UI o por la API | Se rechaza y el rol no cambia | test integración `role-change-nonadmin` |
| CA-43 | RF-23 | El único admin | Intenta quitarse el rol | Se rechaza y sigue habiendo un admin | test integración `role-change-last-admin` |
| CA-44 | RF-24 | Un admin | Guarda un precio de referencia mayor que el precio de la variante | Se guarda y la ficha lo muestra tachado con %; si es menor o igual, se rechaza | test integración `reference-price-admin` (**bloqueado hasta T-003c y la verificación de normativa**) |

**Nuevas tareas derivadas:** T-003d (esquema de ajustes y auditoría), y el panel
se divide en T-010a (productos e imágenes), T-010b (pedidos), T-010c (guías de
tallas y envío), T-010d (usuarios y roles) y T-010e (precio de referencia).
T-004 y T-007 deberán leer los ajustes de envío de BD cuando exista T-010c.

### Enmienda 4 — 2026-10-15 — sin ADR

**Origen:** al revisar el listado implementado en T-005 se pidió que los filtros
vayan en una columna lateral izquierda en escritorio, como en las tiendas de
referencia. RF-14 pide filtros pero no dice dónde. Se concreta sin cambiar el
alcance. No se registra ADR porque no hay alternativas de coste alto de revertir.

**Qué cambia:** se añade un criterio de aceptación. RF-14 no cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-45 | RF-14 | El listado del catálogo en escritorio (ancho ≥ 1024 px) | Se carga | Los filtros aparecen en una columna lateral izquierda, visibles sin desplegar, junto a la rejilla de productos; en móvil siguen en un panel desplegable encima | test e2e `catalog-filters-sidebar` |

**Nuevas tareas derivadas:** T-005c (barra lateral de filtros).

### Enmienda 5 — 2026-10-16 — ADR-006

**Origen:** SPEC-002 exige que los filtros funcionen sin JavaScript (RF-07, CA-07). El
esqueleto de `loading.tsx` lo impide: sin JS el listado no sustituye al esqueleto.

**Qué cambia:** en la sección 6, fila Catálogo, el estado «Cargando» deja de ser
«Esqueleto de tarjetas» y pasa a ser «Indicador de ocupado (`aria-busy`) durante el
filtrado». Sustituye la decisión de T-005 de mantener el esqueleto. CA-01 a CA-45 no
cambian.

**Nuevas tareas derivadas:** ninguna (se aplica en T-008).

### Enmienda 6 — 2026-10-16 — sin ADR

**Origen:** el menú móvil se despliega como un dropdown bajo la cabecera. En e-commerce móvil la
convención es un overlay a pantalla completa que bloquea el fondo (`rules/ui-decisions.md`).
RF-13 pide navegación definida pero no dice cómo se presenta en móvil. Se concreta sin cambiar
el alcance. No se registra ADR: no hay alternativas de coste alto de revertir.

**Qué cambia:** se añaden cinco criterios de aceptación. RF-13 no cambia. Los ids son CA-46 a
CA-50; no pueden ser CA-12 a CA-16, que ya existen en esta spec.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-46 | RF-13 | Un usuario en móvil (< `--bp-md`) | Pulsa el icono de menú | Se abre un overlay a 100dvh y el fondo no se desplaza | test e2e `mobile-menu` a 375 px: overlay con la altura del viewport, `body` con `overflow: hidden` |
| CA-47 | RF-13 | Overlay abierto | Pulsa Esc | Se cierra y el foco vuelve al icono de menú | test e2e `mobile-menu` |
| CA-48 | RF-13 | Overlay abierto | Navega con Tab y Mayús+Tab | El foco no sale del overlay | test e2e `mobile-menu` |
| CA-49 | RF-13 | Un usuario sin JavaScript | Carga la página con `#menu-movil` | El overlay está abierto (CSS `:target`) | test e2e `mobile-menu` con `javaScriptEnabled: false` |
| CA-50 | RF-13 | Un usuario en escritorio (≥ `--bp-md`) | Carga la página | El menú es horizontal en la cabecera, sin overlay ni icono de menú | test e2e `mobile-menu` a 1280 px |

**Nuevas tareas derivadas:** T-013 (menú móvil a pantalla completa).

### Enmienda 7 — 2026-10-16 — sin ADR

**Origen:** el `<select>` «Ordenar por» del catálogo usa el chevrón nativo del navegador, que queda
desalineado respecto al padding del control y no usa los iconos del estilo (lucide). Es un defecto
visual que los tests funcionales no detectan. RF-14 pide ordenación pero no su presentación. Se
concreta sin cambiar el alcance. No se registra ADR: no hay alternativas de coste alto de revertir.

**Qué cambia:** se añaden dos criterios de aceptación. RF-14 no cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-51 | RF-14 | Un usuario | Carga el catálogo | El `<select>` «Ordenar por» muestra un chevrón de lucide alineado con el padding del control, no el nativo del navegador | test e2e `select-chevron`: `appearance: none`, icono dentro del control, centrado en vertical y sin bloquear clics |
| CA-52 | RF-14 | Un usuario | Carga el catálogo a 320, 375, 768 y 1280 px | No hay controles visualmente desalineados (chevrón fuera del borde, texto pegado al borde, iconos descentrados) | test e2e `catalog-controls-aligned` (geometría de los controles) y revisión visual anotada en `sdd/reviews/T-014.md` |

**Nuevas tareas derivadas:** T-014 (pase de pulido visual).

### Enmienda 8 — 2026-10-16 — sin ADR

**Origen:** la revisión visual de T-014 (hallazgos 5 y 6) detectó dos desajustes del listado del
catálogo: la primera imagen de producto, que es la mayor del contenido visible, se carga en
diferido (el aviso de LCP de Next en desarrollo), y la rejilla de tarjetas no sigue la regla del
estilo `v1-soft-commerce` (2 columnas hasta `--bp-md` y 3 desde `--bp-md`; hoy son 2 columnas
hasta 1023 px). RF-01 y RF-14 piden el listado pero no su carga ni su rejilla. Se concretan sin
cambiar el alcance. No se registra ADR: no hay alternativas de coste alto de revertir.

**Qué cambia:** se añaden dos criterios de aceptación. Ningún RF cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-53 | RF-01 | Un usuario | Carga un listado del catálogo (/hombre, /mujer, /novedades) | La primera imagen de producto se carga con prioridad (no en diferido) y el navegador no avisa de LCP sin prioridad | test e2e `catalog-lcp`: la primera imagen no tiene `loading="lazy"` y lleva `fetchpriority="high"`; sin aviso de LCP en consola |
| CA-54 | RF-01 | Un usuario | Carga un listado del catálogo a 768 y 1023 px | El listado muestra 3 columnas de tarjetas (2 por debajo de 768 px) | test e2e `catalog-grid-columns`: nº de columnas por geometría a 375, 768 y 1023 px |

**Nuevas tareas derivadas:** T-015 (imagen LCP con prioridad) y T-016 (rejilla del listado según
el estilo). El número de columnas con la columna lateral (≥ 1024 px) queda por decidir en T-016.

### Enmienda 9 — 2026-10-16 — sin ADR

**Origen:** T-016 dejó por decidir cuántas columnas de tarjetas llevar con la columna lateral de
filtros (≥ 1024 px). El estilo `v1-soft-commerce` pide 4 desde `--bp-lg`, pero la columna lateral
(256 px más 32 px de separación) deja a 1280 px unos 864 px útiles: 4 columnas serían tarjetas de
unos 200 px. El usuario decidió mantener 3. Se concreta sin cambiar el alcance; la desviación del
estilo queda registrada en PLAN-001 §5b.

**Qué cambia:** se añade un criterio de aceptación. Ningún RF cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-55 | RF-01 | Un usuario | Carga un listado del catálogo a 1024, 1280 y 1440 px, con la columna lateral de filtros | El listado muestra 3 columnas de tarjetas, ninguna de menos de 200 px de ancho | test e2e `catalog-grid-columns`: nº de columnas y ancho de tarjeta por geometría |

**Nuevas tareas derivadas:** ninguna (se aplica en T-016).

### Enmienda 10 — 2026-10-16 — sin ADR

**Origen:** al implementar T-015 se vio que el aviso de LCP de Next en consola (solo en desarrollo)
es intermitente: con tres imágenes del mismo tamaño en la primera fila, el navegador puede elegir
como LCP una distinta de la primera (aprox. 1 de cada 6 a 10 cargas en paralelo). Un test e2e que
lo exija fallaría de vez en cuando sin un fallo real. El usuario decidió quitar esa comprobación
automática.

**Qué cambia:** en la verificación de CA-53 se elimina «sin aviso de LCP en consola» como test
automático. Pasa a ser una comprobación manual documentada en `sdd/reviews/T-015.md`. El CA no
cambia: la primera imagen sigue cargándose con prioridad y sin `lazy`, y eso sí se prueba.

**Nuevas tareas derivadas:** ninguna.

### Enmienda 11 — 2026-10-16 — sin ADR

**Origen:** al cerrar T-027 se vio que cinco specs de Playwright (`filters-chips`, `filters-drawer`,
`mobile-menu`, `product-page` y `size-guide`) usan `as unknown as` en 12 sitios, todos para la misma
marca `window.__sinRecarga`. La invariante I2 de la constitución prohíbe `any`, `@ts-ignore` y
`as unknown as`. RNF-01 de esta spec solo nombra `any` y `@ts-ignore`, y ESLint no detectaba el
tercero. No se registra ADR: no hay alternativas de coste alto de revertir.

**Qué cambia:** se añade un criterio de aceptación que cierra el hueco, con una regla de lint como
verificación. RNF-01 no cambia.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-56 | RNF-01 | El código de `src/`, `tests/` y `scripts/` | Se ejecuta `pnpm lint` | No hay `any`, `@ts-ignore` ni `as unknown as`, y reintroducir uno hace fallar el lint | test unitario `lint-invariants` (ESLint sobre fragmentos con cada patrón) y `pnpm lint` |

**Nuevas tareas derivadas:** T-029 (cumplir la invariante I2 en los tests).

### Enmienda 12 — 2026-10-16 — ADR-007

**Origen:** al revisar la ficha (T-005b) el usuario pidió que el selector de color muestre un círculo
con el color real y un subtexto con el nombre del color elegido, en lugar de chips de texto. RF-02
pide «selección de talla y color» pero no dice cómo se presenta. Los valores de color son un grupo
nuevo de tokens fuera de la paleta de marca, y por eso se registra en ADR-007.

**Qué cambia:** se añaden dos criterios de aceptación. RF-02 y CA-03 no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-57 | RF-02 | Un producto con varios colores | Se abre la ficha | Cada color se muestra como un círculo de su color real, con el nombre como nombre accesible; el color elegido lleva un anillo y un subtexto con su nombre; pulsar otro círculo cambia el color elegido, la imagen y el subtexto | test e2e `color-swatches` y test de componente |
| CA-58 | RF-02 | Un color del producto sin token de muestra | Se abre la ficha | Ese color se muestra como chip de texto, no como un círculo de otro color | test de componente `color-swatches` |

**Nuevas tareas derivadas:** T-030 (círculos de color en la ficha).

### Enmienda 13 — 2026-10-16 — sin ADR — CA-59 recuperación de contraseña

**Origen:** al crear T-017 se comprobó que RF-04 incluye la recuperación de contraseña pero ningún CA
la cubre (CA-06 y CA-07 solo cubren registro e inicio de sesión). Sin CA no hay tarea ni prueba.

**Qué cambia:** se añade un criterio de aceptación. RF-04, CA-06 y CA-07 no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-59 | RF-04 | Una persona que olvidó su contraseña | Pide recuperarla con un email, exista o no en la tienda | Ve el mismo mensaje en ambos casos; con el enlace recibido fija una contraseña nueva válida y puede iniciar sesión con ella | test e2e `auth-recovery-request` (mensaje idéntico) y test de integración `auth-recovery-reset` (enlace generado con la API admin, nueva contraseña, inicio de sesión) |

**Nuevas tareas derivadas:** ninguna; CA-59 entra en T-017.

### Enmienda 14 — 2026-10-16 — sin ADR — CA-60 a CA-62 del carrito de invitado

**Origen:** al crear T-018 se comprobó que RF-03 pide añadir, cambiar la cantidad, quitar y persistir
en el navegador, pero los CA existentes (CA-04, CA-05 y CA-28) solo cubren la fusión, el tope por
stock y el envío gratis. Tampoco hay CA para la línea cuyo producto se retiró, caso límite de la
sección 5. Sin CA no hay tarea ni prueba.

**Qué cambia:** se añaden tres criterios de aceptación. RF-03, RF-15, CA-04, CA-05 y CA-28 no
cambian. CA-29 (bloque de envío y devolución) pasa a cumplirse también en el carrito, que hasta
ahora no lo mostraba.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-60 | RF-03 | Una ficha con color y talla elegidos y con stock | Se pulsa «Añadir al carrito» | La línea aparece en el carrito con cantidad 1; si esa variante ya estaba, la cantidad sube en 1 sin pasar del stock | test e2e `cart-add` |
| CA-61 | RF-03 | Un invitado con líneas en el carrito | Recarga la página, cambia una cantidad o quita una línea | Las líneas siguen ahí tras recargar; subtotal, envío y total se recalculan con cada cambio | test e2e `cart-persist-edit` |
| CA-62 | RF-03 | Un invitado con una línea cuya variante ya no existe o cuyo producto está retirado | Abre el carrito | Esa línea se avisa como no disponible, no cuenta en los totales y se puede quitar | test de componente `cart-unavailable-line` |

**Nuevas tareas derivadas:** ninguna por esta enmienda; CA-60 a CA-62 entran en T-018. La fusión con el
carrito de la cuenta (CA-04) pasa a T-031 por la Enmienda 4 del plan.

### Enmienda 15 — 2026-10-17 — sin ADR — CA-63 carrito de la cuenta

**Origen:** al crear T-031 se comprobó que RF-03 dice que el carrito «se fusiona con el de la cuenta»,
pero ningún CA cubre que el carrito de un cliente con sesión se guarde en su cuenta y se vea desde otro
navegador. CA-04 solo cubre la fusión al iniciar sesión.

**Qué cambia:** se añade un criterio de aceptación. RF-03, CA-04, CA-05 y CA-61 no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-63 | RF-03 | Un cliente con sesión y una línea en su carrito | Abre su cuenta en otro navegador | Ve la misma línea; los cambios de cantidad y quitar se guardan en la cuenta y respetan el stock | test e2e `cart-account-persist` y test de integración `cart-account` |

**Datos y privacidad (sección 9):** se añade una fila. El carrito (variante y cantidad) se guarda, para
invitados, en el almacenamiento local del navegador y, para clientes con sesión, en Supabase
(Postgres), vinculado a su cuenta. Se conserva mientras exista la cuenta o hasta que el cliente vacíe
el carrito, y se borra con la baja de cuenta (los datos del carrito se eliminan en cascada). No contiene
datos personales además del vínculo con la cuenta.

**Nuevas tareas derivadas:** ninguna; CA-63 entra en T-031.

### Enmienda 16 — 2026-10-17 — sin ADR — declaración de costes de Stripe y plazos del pago

**Origen:** T-032 es el primer consumidor de Stripe. `docs/costs.md` exige declarar en la sección 10 el
tope, la alerta, la cuota y el comportamiento al tope antes de escribir el primer consumidor. La
sección 10 solo decía «sin coste en test». Se completa sin cambiar el alcance: Stripe sigue en modo test.

| Campo | Contenido |
|---|---|
| Proveedor | Stripe (Checkout alojado) |
| Uso previsto | Crear una sesión de pago por intento de compra de un cliente con sesión; confirmar el pago por webhook (T-033) |
| Plan y coste unitario | Modo test: sin coste. VERIFICAR las tarifas reales antes de cualquier uso con dinero |
| Tope mensual | 0 €: solo claves `sk_test_` y `pk_test_`. Una clave live se rechaza al arrancar (CA-24) y en el módulo `src/lib/stripe/` |
| Alerta de presupuesto | No aplica en modo test. Si algún día se activa el cobro real, se declara aquí antes |
| Cuota máxima | No aplica en modo test. Mientras tanto, un intento nuevo cancela el pedido pendiente anterior del cliente, así que no se acumulan sesiones ni reservas |
| Comportamiento al tope o ante un fallo | Falla cerrado: si Stripe falla, el pedido se cancela, la reserva se libera y se muestra un error; sin reintentos automáticos (`maxNetworkRetries: 0`) |
| ToS revisados | No. VERIFICAR los términos del modo test |

**Plazos:** la reserva de stock dura 35 minutos y la sesión de pago de Stripe 31 (Stripe exige un mínimo de
30; VERIFICAR). La sesión caduca antes que la reserva para que nadie pague con la reserva vencida.

**Nuevas tareas derivadas:** ninguna.

### Enmienda 17 — 2026-10-17 — sin ADR — CA-64 a CA-66 de las imágenes de producto

**Origen:** al crear T-021 se comprobó que RF-09 incluye las imágenes de producto, pero ningún CA cubre
subirlas ni rechazar archivos no válidos; la sección 8 dice «validar tipo y tamaño, bucket con políticas». Las
imágenes se separan en su propia tarea (T-034) porque necesitan Supabase Storage y una migración.

**Qué cambia:** se añaden tres criterios de aceptación. RF-09, CA-15 y CA-16 no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-64 | RF-09 | Un admin y un producto | Sube una imagen JPG, PNG, WebP o AVIF de hasta 2 MB con texto alternativo | La imagen se guarda en Storage y aparece en la ficha y en el listado de ese producto | test e2e `admin-upload-image` |
| CA-65 | RF-09 | Un admin | Sube un archivo de otro tipo (p. ej. SVG o ejecutable), de más de 2 MB o sin texto alternativo | Se rechaza con un mensaje y no se guarda ningún archivo ni fila | test de integración `image-upload-validation` |
| CA-66 | RF-09 | Un usuario no admin | Intenta subir o borrar una imagen de producto | Se rechaza y no cambia nada en Storage ni en la BD | test de integración `image-upload-nonadmin` |

**Nuevas tareas derivadas:** T-034 (imágenes de producto con Storage). T-021 queda para productos, variantes y stock.

### Enmienda 18 — 2026-10-19 — ADR-009 — fotos reales del catálogo inicial y Hero de la Home (CA-67 a CA-70)

**Origen:** hay fotos reales de seis productos del seed y dos fotos de marca. La spec no tiene ningún criterio
sobre cómo se sirven las fotos del catálogo inicial ni sobre la portada. T-034 (Storage) cubre las altas desde el
panel, no esto. Decisión y alternativas en ADR-009.

**Qué cambia:** se añade RF-23 y cuatro criterios. RF-02 y RF-09 no cambian.

| ID | Requisito |
|---|---|
| RF-23 | La portada abre con una imagen de marca (Hero): la foto vertical en móvil y la horizontal en escritorio, con el texto superpuesto o al lado. |

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-70 | RF-02 | Fotos originales en `public/images/raw/` (fuera de Git) | Se ejecuta `pnpm optimize-images` | Genera versiones AVIF/WebP redimensionadas en `public/images/products/` y `public/images/hero/`, sin tocar los originales, de forma repetible; con la carpeta vacía o un archivo no válido falla con un mensaje claro | test unitario `optimize-images` |
| CA-67 | RF-02 | Un producto con imagen en `/images/products/` | Se abre el catálogo o su ficha | La imagen se sirve desde `/images/products/`; la BD y el esquema Zod aceptan esa ruta y siguen aceptando `/products/` (SVG heredados) y rechazan cualquier otra | test de integración `product-images-path` y test unitario del esquema |
| CA-68 | RF-02 | Los seis productos con foto nueva (polo piqué, polo de punto, camisa oxford, camisa de popelín, chino slim y pantalón de traje) | Se abre el catálogo y la ficha de cada uno | Cada uno muestra su foto, con texto alternativo no vacío, en lugar del SVG; el resto de productos conserva su imagen | test e2e `catalog-real-photos` |
| CA-69 | RF-23 | Un visitante en la Home | Abre `/` a 375 px y a 1280 px | A 375 px ve la foto vertical y a 1280 px la horizontal, con el texto legible (contraste AA) y sin scroll horizontal | test e2e `home-hero` y test de contraste/axe |

**Nuevas tareas derivadas:** T-035 (script `optimize-images`), T-036 (migración de la ruta y fotos de los seis
productos), T-037 (Hero de la Home). T-034 no cambia.

### Enmienda 19 — 2026-10-20 — ADR-009 — fotos reales de los seis productos de mujer (CA-71)

**Origen:** la Enmienda 18 cubrió las fotos de los seis productos de hombre (CA-68). Hay fotos reales de los seis
productos de mujer del seed (tres blusas, el polo de punto, la camisa oversize y el pantalón fluido). Misma
decisión y mismo flujo que ADR-009 (estáticos optimizados con `pnpm optimize-images`); no hace falta ADR nuevo.

**Qué cambia:** se añade un criterio de aceptación. RF-02, CA-67, CA-68 y CA-70 no cambian.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-71 | RF-02 | Los seis productos de mujer con foto nueva (`blusa-lino-casual`, `blusa-satinada-vestir`, `blusa-popelin-lazada`, `polo-punto-mujer`, `camisa-oversize-mujer` y `pantalon-fluido-vestir`) | Se abre el catálogo de mujer y la ficha de cada uno | Cada uno muestra su foto, servida desde `/images/products/`, con texto alternativo no vacío, en lugar del SVG; los productos sin foto nueva conservan su imagen | test e2e `catalog-real-photos` (casos de mujer) |

**Nuevas tareas derivadas:** T-038 (fotos de mujer). T-034 no cambia.

### Enmienda 20 — 2026-10-20 — sin ADR — barra fija «Añadir al carrito» en la ficha (CA-72)

**Origen:** el patrón «Ficha de producto: en móvil, imagen arriba y barra inferior fija con el CTA» está en el
estilo v1 (`design/styles/v1-soft-commerce/style.md`, sección Responsive), pero ningún criterio de la spec lo
cubre. En una ficha larga, el botón «Añadir al carrito» queda fuera de pantalla al bajar por la información de ajuste.

**Qué cambia:** se añade un criterio de aceptación, solo para móvil (menos de `--bp-md`, 768 px). RF-02, RF-03 y CA-03,
CA-60 no cambian. La barra reutiliza el `AddToCartButton` existente (mismo carrito, mismo aviso `aria-live`).

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-72 | RF-02 | Un visitante en la ficha de un producto en móvil (menos de 768 px) | Baja hasta que el botón «Añadir al carrito» sale de pantalla | Aparece una barra fija inferior con el nombre, el precio y un botón «Añadir al carrito» que añade la variante elegida igual que el original; la barra se oculta cuando el botón original vuelve a verse, no aparece desde 768 px y, con `prefers-reduced-motion`, aparece sin animación | test e2e `sticky-add-to-cart` y test unitario `StickyAddToCart` |

**Nuevas tareas derivadas:** T-039 (barra fija en la ficha).

> Nota: umbrales marcados VERIFICAR (Lighthouse, cuotas, términos de proveedores) se
> confirmarán antes de aprobar la spec.
