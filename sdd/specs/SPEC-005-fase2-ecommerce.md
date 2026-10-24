---
id: SPEC-005-fase2-ecommerce
title: Fase 2 — área de usuario, ofertas y sección de app móvil
status: borrador
rigor_level: L
created: 2026-10-24
updated: 2026-10-24
---

# SPEC-005 — Fase 2: área de usuario, ofertas y «Trama en tu móvil»

> **BORRADOR para revisión del usuario. No está aprobada: no se programa nada hasta que lo esté** (I1).
> Se numera 005 porque SPEC-004 ya existe (integración continua, aprobada) y SPEC-002 reserva el nombre SPEC-003. El «paso 1» del
> usuario (`/buscar` con la tarjeta completa) no va aquí: se cubrió con la Enmienda 42 de SPEC-001 y la tarea T-098.
> Todo lo marcado **VERIFICAR** o **DP-n** (decisión pendiente) está sin decidir; ninguna cifra ni texto legal está inventado.

## 0. Qué existe ya (comprobado en el repo, no se vuelve a pedir)

| Pieza | Estado real | Dónde |
|---|---|---|
| `/cuenta` (perfil + lista de direcciones) | **Existe**, sin barra lateral: una sola página con «Cerrar sesión» arriba | `src/app/cuenta/page.tsx` |
| Direcciones: `/cuenta/direcciones/nueva` y `/cuenta/direcciones/[id]` | **Existen** (alta, edición, borrado) | `src/app/cuenta/direcciones/` |
| Tabla `public.addresses` con RLS (select/insert/update/delete propias) | **Existe** desde la migración inicial. **No se propone otra tabla** | `20261012000000_identity_and_orders.sql` |
| Tabla `profiles` (`full_name`, `role`) | **Existe** | ídem |
| `/cuenta/pedidos` y `/cuenta/pedidos/[id]` | **Existen** | `src/app/cuenta/pedidos/` |
| `/acceso`, `/registro`, `/recuperar` | **Existen como páginas** (no hay modal) | `src/app/acceso`, `registro`, `recuperar` |
| Favoritos | **Solo documentados, NO implementados**: ADR-010 y Enmienda 21 (RF-24, CA-73 a CA-78) existen, pero T-041, T-042 y T-043 están `pendiente`, no hay tabla `favorites` ni código. **Se reutiliza ese diseño; no se reabre la decisión** | `sdd/adrs/ADR-010`, `sdd/tasks/T-041..043` |
| Cupón de bienvenida 10 % (`welcome_coupons`, T-093/T-094) | **Existe**: un código por email, un solo uso, primera compra | migración `20261023000000` |
| `products.is_new` (booleano) | **Existe**; filtro `onlyNew` en `queries.ts` | `20261015000000_catalog_and_cart.sql` |
| Rebajas: `product_variants.compare_at_cents` (> `price_cents`) | **Existe** (T-075); insignia «−N %» y precio tachado en la tarjeta; 5 prendas de ejemplo en `supabase/seed/catalog-discounts.sql` | `20261021000000_compare_at_price.sql` |
| `/ofertas` | **Existe pero vacía**: siempre muestra «Ahora mismo no hay ofertas». La Enmienda 32 la dejó «como tarea aparte» | `src/app/ofertas/page.tsx` |
| Puntos de fidelización, referidos, `is_offer` | **No existen** | — |

## 1. Objetivos

1. Que la cuenta del cliente se parezca a la de una tienda real: modal de acceso, `/cuenta` con barra lateral y secciones claras.
2. Que la sección **Ofertas** funcione de verdad (hoy está vacía aunque hay rebajas en la BD) y que haya más productos nuevos.
3. Añadir en la portada una sección «Trama en tu móvil» que deje claro que es una demo.
4. (Opcional, sujeto a DP-4 y DP-5) Programa de puntos «Trama Club» y de referidos «Recomienda y gana».

## 2. Fuera de alcance

1. Una app móvil real (Paso 4 es solo una sección de portada).
2. Cobro real, puntos canjeables por dinero real, o sorteos/premios con valor real.
3. Email transaccional propio (SPEC-001 §2.5): las invitaciones de referidos no se envían por correo.
4. Inicio de sesión social (Google, Apple…), 2FA, borrar cuenta (VERIFICAR si se quiere; RGPD obliga a poder ejercer la supresión: ver §9).
5. Cambiar de estilo (se mantiene `v1-soft-commerce@0.3.0`; `/cuenta` no es un panel de administración, `rules/styles.md`).
6. Reseñas.

## 3. Requisitos funcionales

### Paso 2 — Área de usuario

| ID | Requisito |
|---|---|
| RF-01 | **Modal de acceso.** El icono de usuario de la cabecera abre un modal con pestañas «Iniciar sesión» / «Crear cuenta», con el mismo contenido y validación que `/acceso` y `/registro` (se reutilizan sus acciones de servidor). Sin JavaScript, el icono sigue siendo un enlace a `/acceso` (`rules/ui-decisions.md`: icono de acción como enlace con hash). Las páginas `/acceso` y `/registro` se mantienen (retornos de `?siguiente=`, enlaces externos). Estilo limpio de referencia «Fútbol Emotion» (**VERIFICAR**: no hay material en `sdd/explorations`; ver DP-1). |
| RF-02 | **`/cuenta` con barra lateral** con cuatro entradas: «Mis datos», «Mis pedidos», «Mis favoritos», «Cerrar sesión». Escritorio: columna lateral persistente (convención SaaS/e-commerce). Móvil: navegación horizontal o selector declarado antes de cerrar (puerta 7). |
| RF-03 | **Mis datos** (`/cuenta`): nombre (ya existe `ProfileForm`), cambio de contraseña (ya existe, aviso `?aviso=contrasena`) y **gestión de direcciones** con lo que ya hay (`addresses`). No hay nueva tabla ni nueva pantalla de direcciones; solo se integran en la barra. |
| RF-04 | **Mis pedidos**: reutiliza `/cuenta/pedidos`. Solo se mueve bajo el layout con barra lateral. |
| RF-05 | **Mis favoritos** (`/cuenta/favoritos`): se implementa lo ya aprobado en ADR-010 / RF-24 (T-041, T-042, T-043). Esta spec solo los **coloca** en la barra; no duplica sus CA. |
| RF-06 | **Cerrar sesión**: acción existente (`logoutAction`), ahora en la barra lateral. |
| RF-07 | **Trama Club (puntos)** — **BORRADOR sujeto a DP-4**. Cada cliente con sesión acumula puntos por pedido pagado y los ve en `/cuenta/club`. Qué da cada euro, qué se canjea, caducidad y si hay niveles: **sin decidir (VERIFICAR, no se inventan cifras)**. |
| RF-08 | **Recomienda y gana (referidos)** — **BORRADOR sujeto a DP-5**. Cada cliente tiene un código/enlace personal; cuando un amigo se registra con él y paga su primer pedido, ambos obtienen una ventaja (**cuál: sin decidir**). Reglas antifraude en §8. |

### Paso 3 — Ofertas y novedades

| ID | Requisito |
|---|---|
| RF-09 | **Más productos «nuevos».** Se amplía el seed con productos `is_new = true` (columna ya existente; **no se propone columna nueva**). Cuántos y cuáles: DP-6. |
| RF-10 | **Campo `is_offer`.** Ver DP-3: ya existe `compare_at_cents` (precio anterior por variante), que **ya define una oferta** (tarjeta con «−N %»). La propuesta del usuario (`is_offer boolean` en `products` + descuento) duplicaría esa fuente de verdad. Opciones y recomendación en DP-3. |
| RF-11 | **`/ofertas` conectada:** lista las prendas ofertadas (misma `ProductCard` completa) con contador, filtros/orden del catálogo si aplica, y el estado vacío actual solo cuando no haya ninguna. |
| RF-12 | **Banner en la página de Ofertas:** franja superior con titular, texto corto y, si procede, «hasta −N %» calculado de los datos reales (no un número fijo en el código). Imagen del banner como estático optimizado (ADR-009). |

### Paso 4 — «Trama en tu móvil»

| ID | Requisito |
|---|---|
| RF-13 | **Sección al final de la portada**, antes del pie: titular «Trama en tu móvil», texto breve, mockup de un teléfono con la tienda y dos botones de tienda (App Store / Google Play). |
| RF-14 | **Aviso explícito de demostración:** «Trama es un proyecto de demostración: no existe una app real.» visible en la propia sección (`role="note"`), no solo en un tooltip. |
| RF-15 | **Qué hacen los botones** (la puerta 7 prohíbe enlaces muertos y `#`): ver DP-7. Propuesta: son botones que abren un pequeño diálogo accesible «App no disponible — esto es una demo» con enlace a `/novedades`; **nunca** enlazan a las tiendas reales ni a una URL inventada. |
| RF-16 | **Mockup:** imagen del teléfono. Yo no puedo generar imágenes binarias aquí (**VERIFICAR** con el usuario, DP-8): alternativas en DP-8. |

## 4. Requisitos no funcionales

- **Accesibilidad AA** (I6): modal con `role="dialog"`, `aria-modal`, foco atrapado y devuelto, Esc / X / clic fuera (puerta 7); barra lateral con `nav` etiquetada y `aria-current`; zonas táctiles ≥ 44 px; texto ≥ 12 px.
- **Movimiento** (I7): sin transición con `prefers-reduced-motion`; sin scroll-jacking.
- **Responsive 320–1280 px** sin scroll horizontal; `tests/responsive.spec.ts` ampliado con `/cuenta`, `/ofertas` y la portada; captura a 375 px de cada pantalla nueva.
- **Estilo por tokens** (v1-soft-commerce@0.3.0): sin hex ni valores arbitrarios; `check-palette` verde.
- **Convención del sector** (`rules/ui-decisions.md`): barra lateral de cuenta en escritorio, modal de acceso, banner de ofertas; cualquier desvío se justifica en `## Decisiones de UI` del plan.
- **Rendimiento:** la portada sigue estática (el layout no lee la sesión, Enmienda 37); el modal averigua la sesión en cliente.
- **Zod** (I5) en toda entrada nueva (código de referido, canje de puntos, formularios del modal).
- **Tests:** cada CA con test; RLS con prueba de aislamiento por cada tabla nueva (I3).

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Abrir el modal con la sesión ya iniciada | El icono lleva a `/cuenta` (no abre el modal). |
| Login desde el modal con `?siguiente=` / carrito de invitado | Se conserva el retorno y se fusiona el carrito (`GuestCartMerger`). |
| Cliente sin pedidos / sin direcciones / sin favoritos | Estado vacío con enlace útil, no pantalla en blanco. |
| Producto con `is_offer` pero sin `compare_at_cents` (si DP-3 = opción B) | Debe impedirse con una restricción de BD; no existe oferta sin descuento. |
| Producto ofertado agotado | Se muestra con «Agotado», sin panel de compra. |
| `/ofertas` sin ofertas | Estado vacío actual. |
| Usuario se auto-refiere / dos cuentas con el mismo email / ciclo de referidos | Se rechaza (§8). |
| Puntos tras un pedido cancelado o reembolsado | Se revierten o nunca se conceden hasta `pagado` (DP-4). |
| Botones de «tienda de apps» sin app | Abren el diálogo de demo (RF-15), nunca un enlace muerto. |

## 6. Estados de error y vacío en la UI

- Modal: error de credenciales y de red con `role="alert"` y sin cerrar el modal; cuenta ya existente; contraseña débil.
- `/cuenta/*`: fallo de carga con el aviso existente («No hemos podido cargar tus datos…»); vacíos con CTA.
- `/ofertas`: error de datos propagado a `error.tsx` del catálogo; vacío con enlace a Novedades.
- Club/referidos: saldo 0, código inexistente o caducado, límite alcanzado: mensajes concretos.

## 7. Máquina de estados

Solo si se aprueban Club y referidos (DP-4, DP-5):

- Movimiento de puntos: `pendiente` → `confirmado` (pedido `pagado`) → `canjeado` / `caducado` / `revertido`.
- Referido: `registrado` → `primer_pedido_pagado` (recompensa concedida) / `rechazado` (fraude o cancelación).

## 8. Riesgos de seguridad

- **Antifraude de referidos** (el mayor riesgo): auto-referidos con emails desechables (en esta demo no se verifica el email: `mailer_autoconfirm`, Enmienda 41), granjas de cuentas, ciclos. Mitigaciones candidatas: la recompensa solo al **primer pedido pagado**, un referido por cuenta nueva, tope por referidor, comprobación de que referidor ≠ referido, y cálculo **solo en el servidor** (el navegador nunca manda importes). **VERIFICAR** el nivel de rigor aceptable para una demo.
- **Puntos:** concesión y canje en el servidor, idempotentes (webhook de Stripe repetido no duplica puntos), con tabla de movimientos append-only (no un saldo editable).
- **RLS** (I3) en toda tabla nueva: el cliente solo lee sus puntos/referidos; nadie escribe desde el cliente; solo servicio. Prueba de aislamiento entre usuarios.
- **Modal de acceso:** mismas protecciones que `/acceso` (validación Zod, `nextPathSchema` contra redirecciones abiertas, sin enumeración de cuentas en los mensajes).
- **Enlace/código de referido:** aleatorio y no adivinable; no revelar el email del referidor.
- **Banner/sección de app:** no usar marcas de tiendas de apps de forma que sugiera una app real o una afiliación (**VERIFICAR** guías de uso de marca de Apple y Google antes de usar sus insignias oficiales; DP-7).
- Migraciones: se aplican a mano a `trama-dev`, **compartida con la web pública**; las migraciones de esta fase no deben alterar datos existentes y el seed de nuevos/ofertas debe ser idempotente (los tests esperan stock concreto; no se tocan cantidades).

## 9. Datos y privacidad

| Dato | Para qué | Cuánto tiempo | Cómo se borra |
|---|---|---|---|
| Direcciones, perfil | Ya existen | Ya definido | Borrado en cascada con la cuenta |
| Favoritos (`favorites`, ADR-010) | Apartado de favoritos | Mientras exista la cuenta | Cascada |
| Puntos (movimientos) — si DP-4 | Programa Club | **VERIFICAR** (caducidad) | Cascada con la cuenta |
| Referidos (quién invitó a quién) — si DP-5 | Recompensa y antifraude | **VERIFICAR** | Cascada; el referido es dato personal de un **tercero**: el referidor ve a lo sumo un contador, no su email |

- Puntos y referidos son **perfilado/relaciones entre personas**: exigen actualizar `/privacidad` y las condiciones del programa. **VERIFICAR con asesoría legal** (base jurídica, información a terceros referidos, condiciones de la promoción). **No se redactan textos legales aquí.**
- El derecho de supresión implica poder borrar la cuenta (hoy no existe): fuera de alcance de este borrador pero **DP-9**.
- Modal, banner y sección de app no guardan datos nuevos.

## 10. APIs externas y términos de servicio

- **Supabase (Auth/BD):** sin llamadas nuevas más allá de las ya usadas; sin coste adicional.
- **Stripe:** los puntos o referidos **no** pasan por Stripe salvo que se conviertan en cupón de pago (reutilizaría el mecanismo `amount_off` de la Enmienda 41; **VERIFICAR** en DP-4). Sin nuevos costes ni topes.
- **App Store / Google Play:** no se integra ninguna API. Las insignias oficiales tienen **guías de marca propias (VERIFICAR)**; propuesta: no usarlas (DP-7).
- **Generación de imagen del mockup:** si se usa un servicio de pago, tope de coste según `docs/costs.md` (**VERIFICAR**); alternativa sin API en DP-8.

## 11. Criterios de aceptación

**Pendientes de redactar tras decidir las DP.** Esbozo de cobertura (cada uno con su RF, Dado/Cuando/Entonces y test):
RF-01 (e2e modal: abrir/cerrar/foco/Esc/clic fuera/sin JS), RF-02 a RF-06 (e2e de `/cuenta` con barra lateral y axe, responsive 320–1280), RF-09 a RF-12 (integración de la consulta de ofertas con BD real + e2e de `/ofertas`), RF-13 a RF-16 (e2e de la portada y del diálogo; sin enlaces muertos), y si se aprueban RF-07/RF-08 (integración con RLS e idempotencia del webhook).

## 12. Tareas previstas (orientativo, a crear tras aprobar)

1. Layout de `/cuenta` con barra lateral (+ vacíos).
2. Favoritos: ya existen T-041, T-042, T-043 (pendientes): se ejecutan, no se duplican.
3. Modal de acceso.
4. Datos de ofertas (migración según DP-3) + seed idempotente de nuevos/ofertas.
5. `/ofertas` conectada + banner.
6. Sección «Trama en tu móvil».
7. (Si DP-4) Trama Club: datos + RLS → lógica → pantalla.
8. (Si DP-5) Referidos: datos + RLS → lógica → pantalla.

---

## DECISIONES PENDIENTES

| # | Decisión | Opciones y trade-off | Recomendación |
|---|---|---|---|
| **DP-1** | Referencia «Fútbol Emotion» para el modal | (a) Ejecutar `/competencia` sobre su web y guardarlo como exploración (rigor, tarda). (b) Que el usuario pegue capturas/descripción. (c) Diseñar un modal limpio estándar con los tokens v1 y sin referencia. | **(a)**: `rules/ui-decisions.md` pide investigar, no adivinar la convención. Mientras, la spec no cierra el diseño del modal. |
| **DP-2** | ¿`/cuenta` con barra lateral en móvil? | (a) Barra superior con pestañas desplazables. (b) Selector desplegable. (c) Menú inferior (tab bar). | **(a)**: es lo habitual en cuentas de e-commerce y mantiene las 4 entradas visibles. |
| **DP-3** | `is_offer` frente a `compare_at_cents` | (A) **Derivar «oferta» de `compare_at_cents`** (sin columna nueva): una sola fuente de verdad, `/ofertas` ya tendría 5 prendas de seed. (B) Añadir `products.is_offer boolean` (+ `discount_percent`) como pide el usuario: duplica el dato y puede contradecir el precio tachado; exigiría CHECK y migración. (C) Ambos: `is_offer` como etiqueta editorial y `compare_at_cents` como precio. | **A**. Si el usuario quiere el campo `is_offer` literal, **B/C con una restricción que impida `is_offer` sin descuento**. Es el único punto donde su petición choca con lo que ya existe. |
| **DP-4** | Trama Club (puntos) | (a) Implementarlo (cifras, canje, caducidad a decidir por el usuario; texto legal). (b) Solo una pantalla informativa «Próximamente» honesta, sin lógica. (c) Dejarlo fuera de la fase. | **(b)** en esta fase: en una demo con pagos en test los puntos no tienen valor real y añaden privacidad y fraude; si el usuario lo quiere funcional, **(a)** con ADR y sus cifras. |
| **DP-5** | Recomienda y gana | Igual que DP-4, más riesgo de fraude y datos de terceros. | **(b)/(c)**: lo más delicado de la spec; implementarlo solo con cifras, reglas antifraude y asesoría legal decididas. |
| **DP-6** | Cuántos productos `is_new` más | Número y categorías; las fotos son estáticos (ADR-009). | Que el usuario diga cuántos; recomiendo ≥ 8 para llenar la rejilla de Novedades; fotos nuevas: ¿las aporta él? |
| **DP-7** | Botones de tiendas de apps | (a) Diálogo «App no disponible (demo)». (b) Botones desactivados con `aria-disabled` y texto «Próximamente». (c) Enlazar a las tiendas reales (prohibido por puerta 7 y engañoso). | **(a)**, con botones propios (no las insignias oficiales, para evitar problemas de marca y sugerir una app real). |
| **DP-8** | Mockup «imagen generada» | (a) Que el usuario genere/aporte la imagen (Gemini, etc.) y se añade como estático. (b) Maquetar el teléfono en HTML/CSS/SVG con capturas de la propia tienda (sin API, sin coste). (c) Servicio de imagen de pago (tope de coste obligatorio). | **(b)** o **(a)**: yo no genero binarios aquí y (c) añade coste y revisión de términos. |
| **DP-9** | ¿Se incluye «borrar mi cuenta»? | Incluirlo en la barra o diferirlo. | Diferirlo a otra spec, pero **anotarlo**: es un requisito de privacidad de cualquier área de usuario real. |
| **DP-10** | Orden de ejecución | (a) Cuenta + favoritos primero; ofertas después; app móvil al final. (b) Ofertas primero (valor visible rápido). | **(b)**: `/ofertas` vacía es el hueco más visible y DP-3 no depende de legal; Club/Referidos al final o fuera. |
